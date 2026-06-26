import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { TenantContext } from '../common/context/tenant-context';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  async validateGroupMembership(
    userId: string,
    role: string,
    groupId: string,
  ): Promise<boolean> {
    const instanceId = this.getInstanceId();

    if (role === 'teacher') {
      const group = await this.prisma.group.findFirst({
        where: { id: groupId, instanceId },
      });
      if (!group) return false;
      return true;
    }

    if (role === 'student') {
      const student = await this.prisma.student.findFirst({
        where: { id: userId, groupId, instanceId },
      });
      if (!student) return false;
      return true;
    }

    return false;
  }

  async getSenderName(userId: string, role: string): Promise<string> {
    const instanceId = this.getInstanceId();

    if (role === 'teacher') {
      const teacher = await this.prisma.teacher.findFirst({
        where: { id: userId, instanceId },
      });
      return teacher?.name ?? 'Unknown';
    }

    const student = await this.prisma.student.findFirst({
      where: { id: userId, instanceId },
    });
    return student?.name ?? 'Unknown';
  }

  async sendMessage(
    senderId: string,
    senderRole: string,
    groupId: string,
    content: string,
  ) {
    const instanceId = this.getInstanceId();

    const message = await this.prisma.chatMessage.create({
      data: {
        content,
        senderId,
        senderRole: senderRole as 'TEACHER' | 'STUDENT',
        groupId,
        instanceId,
      },
    });

    const senderName = await this.getSenderName(senderId, senderRole);

    return {
      id: message.id,
      senderId: message.senderId,
      senderName,
      senderRole: message.senderRole,
      content: message.content,
      fileUrl: message.fileUrl ?? undefined,
      groupId: message.groupId,
      createdAt: message.createdAt.toISOString(),
    };
  }

  async uploadFile(
    senderId: string,
    senderRole: string,
    groupId: string,
    file: Express.Multer.File,
  ) {
    const instanceId = this.getInstanceId();
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const objectPath = `chat/${instanceId}/${groupId}/${Date.now()}_${senderId}.${ext}`;

    await this.minio.uploadBuffer(file.buffer, objectPath, file.mimetype);
    const fileUrl = this.minio.getObjectUrl(objectPath);

    const message = await this.prisma.chatMessage.create({
      data: {
        content: file.originalname,
        senderId,
        senderRole: senderRole as 'TEACHER' | 'STUDENT',
        fileUrl,
        groupId,
        instanceId,
      },
    });

    const senderName = await this.getSenderName(senderId, senderRole);

    return {
      id: message.id,
      senderId: message.senderId,
      senderName,
      senderRole: message.senderRole,
      content: file.originalname,
      fileUrl: message.fileUrl ?? undefined,
      groupId: message.groupId,
      createdAt: message.createdAt.toISOString(),
    };
  }

  async getMessages(groupId: string, cursor?: string, limit: number = 50) {
    const instanceId = this.getInstanceId();

    const where: Record<string, unknown> = { groupId, instanceId };

    if (cursor) {
      const cursorMessage = await this.prisma.chatMessage.findUnique({
        where: { id: cursor },
      });
      if (cursorMessage) {
        where.createdAt = { lt: cursorMessage.createdAt };
      }
    }

    const messages = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    if (hasMore) messages.pop();

    const data = await Promise.all(
      messages.map(async (msg) => {
        const senderName = await this.getSenderName(
          msg.senderId,
          msg.senderRole,
        );
        return {
          id: msg.id,
          senderId: msg.senderId,
          senderName,
          senderRole: msg.senderRole,
          content: msg.content,
          fileUrl: msg.fileUrl ?? undefined,
          groupId: msg.groupId,
          createdAt: msg.createdAt.toISOString(),
        };
      }),
    );

    return {
      data,
      total: data.length,
      ...(hasMore && data.length > 0
        ? { nextCursor: data[data.length - 1].id }
        : {}),
    };
  }

  async deleteMessage(messageId: string) {
    const instanceId = this.getInstanceId();

    const message = await this.prisma.chatMessage.findFirst({
      where: { id: messageId, instanceId },
    });
    if (!message) throw new NotFoundException('Message not found');

    if (message.fileUrl) {
      const urlParts = message.fileUrl.split('/');
      const objectPath = urlParts.slice(4).join('/');
      if (objectPath) {
        try {
          await this.minio.deleteObject(objectPath);
        } catch (error) {
          this.logger.warn(
            `Failed to delete file from MinIO: ${(error as Error).message}`,
          );
        }
      }
    }

    await this.prisma.chatMessage.delete({ where: { id: messageId } });
  }

  async getUnreadCounts(userId: string, role: string) {
    const instanceId = this.getInstanceId();

    let groupIds: string[];
    if (role === 'teacher') {
      const groups = await this.prisma.group.findMany({
        where: { instanceId },
        select: { id: true },
      });
      groupIds = groups.map((g) => g.id);
    } else {
      const student = await this.prisma.student.findFirst({
        where: { id: userId, instanceId },
        select: { groupId: true },
      });
      if (!student) return { data: [] };
      groupIds = [student.groupId];
    }

    const markers = await this.prisma.chatReadMarker.findMany({
      where: { userId, groupId: { in: groupIds } },
    });

    const markerMap = new Map(markers.map((m) => [m.groupId, m.lastReadAt]));

    const data = await Promise.all(
      groupIds.map(async (groupId) => {
        const lastReadAt = markerMap.get(groupId);
        const count = await this.prisma.chatMessage.count({
          where: {
            groupId,
            instanceId,
            ...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {}),
          },
        });
        return { groupId, count };
      }),
    );

    return { data };
  }

  async markRead(userId: string, groupId: string) {
    const instanceId = this.getInstanceId();

    await this.prisma.chatReadMarker.upsert({
      where: { userId_groupId: { userId, groupId } },
      update: { lastReadAt: new Date() },
      create: {
        userId,
        groupId,
        lastReadAt: new Date(),
        instanceId,
      },
    });
  }
}
