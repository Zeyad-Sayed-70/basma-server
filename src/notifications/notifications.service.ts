import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';
import { TierFeatureService } from '../common/services/tier-feature.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';
import {
  CreateNotificationDto,
  SendAnnouncementDto,
  UpdateNotificationPreferenceDto,
} from './dto/index';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
    private readonly tierFeatureService: TierFeatureService,
  ) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  async create(dto: CreateNotificationDto) {
    const instanceId = this.getInstanceId();

    await this.tierFeatureService.requireFeature(
      instanceId,
      'sessionNotifications',
    );

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const notifsThisMonth = await this.prisma.notification.count({
      where: { instanceId, createdAt: { gte: startOfMonth } },
    });
    await this.tierFeatureService.checkResource(
      instanceId,
      'whatsappNotifsPerMonth',
      notifsThisMonth,
    );

    const notification = await this.prisma.notification.create({
      data: {
        type: dto.type,
        title: dto.title,
        body: dto.body,
        recipientPhone: dto.recipientPhone,
        instanceId,
      },
    });

    if (!dto.recipientPhone || !this.whatsAppService.isConnected(instanceId)) {
      return notification;
    }

    try {
      const jid = `${dto.recipientPhone}@s.whatsapp.net`;
      await this.whatsAppService.sendMessage(instanceId, jid, {
        text: `*${dto.title}*\n\n${dto.body}`,
      });

      await this.prisma.notificationLog.create({
        data: {
          notificationId: notification.id,
          recipientPhone: dto.recipientPhone,
          status: 'SENT',
          attempts: 1,
          lastAttemptedAt: new Date(),
        },
      });

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'SENT' },
      });
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp to ${dto.recipientPhone}: ${(error as Error).message}`,
      );

      await this.prisma.notificationLog.create({
        data: {
          notificationId: notification.id,
          recipientPhone: dto.recipientPhone,
          status: 'FAILED',
          error: (error as Error).message,
          attempts: 1,
          lastAttemptedAt: new Date(),
        },
      });

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FAILED' },
      });
    }

    return notification;
  }

  async findAll(type?: string, status?: string, page = 1, limit = 50) {
    const instanceId = this.getInstanceId();
    const where: Record<string, unknown> = { instanceId };
    if (type) where.type = type;
    if (status) where.status = status;

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { _count: { select: { logs: true } } },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      data: data.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        recipientPhone: n.recipientPhone,
        status: n.status,
        logCount: n._count.logs,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    const instanceId = this.getInstanceId();
    const notification = await this.prisma.notification.findFirst({
      where: { id, instanceId },
      include: { logs: { orderBy: { createdAt: 'desc' } } },
    });
    if (!notification) throw new NotFoundException('Notification not found');

    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      recipientPhone: notification.recipientPhone,
      status: notification.status,
      logs: notification.logs.map((l) => ({
        id: l.id,
        recipientPhone: l.recipientPhone,
        status: l.status,
        waMessageId: l.waMessageId,
        error: l.error,
        attempts: l.attempts,
        lastAttemptedAt: l.lastAttemptedAt?.toISOString() ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
    };
  }

  async sendAnnouncement(dto: SendAnnouncementDto) {
    const instanceId = this.getInstanceId();

    await this.tierFeatureService.requireFeature(
      instanceId,
      'sessionNotifications',
    );

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const notifsThisMonth = await this.prisma.notification.count({
      where: { instanceId, createdAt: { gte: startOfMonth } },
    });
    await this.tierFeatureService.checkResource(
      instanceId,
      'whatsappNotifsPerMonth',
      notifsThisMonth,
    );

    const students = await this.prisma.student.findMany({
      where: {
        groupId: { in: dto.groupIds },
        instanceId,
        status: 'ACTIVE',
        phone: { not: null },
      },
      select: { id: true, name: true, phone: true },
    });

    const notifications: Array<{ id: string }> = [];

    for (const student of students) {
      if (!student.phone) continue;

      const notification = await this.prisma.notification.create({
        data: {
          type: 'CUSTOM',
          title: dto.title,
          body: dto.body,
          recipientPhone: student.phone,
          instanceId,
        },
      });

      if (this.whatsAppService.isConnected(instanceId)) {
        try {
          const jid = `${student.phone}@s.whatsapp.net`;
          await this.whatsAppService.sendMessage(instanceId, jid, {
            text: `*${dto.title}*\n\n${dto.body}`,
          });

          await this.prisma.notificationLog.create({
            data: {
              notificationId: notification.id,
              recipientPhone: student.phone,
              status: 'SENT',
              attempts: 1,
              lastAttemptedAt: new Date(),
            },
          });

          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { status: 'SENT' },
          });
        } catch (error) {
          this.logger.error(
            `Failed to send WhatsApp to ${student.phone}: ${(error as Error).message}`,
          );

          await this.prisma.notificationLog.create({
            data: {
              notificationId: notification.id,
              recipientPhone: student.phone,
              status: 'FAILED',
              error: (error as Error).message,
              attempts: 1,
              lastAttemptedAt: new Date(),
            },
          });

          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { status: 'FAILED' },
          });
        }
      }

      notifications.push({ id: notification.id });
    }

    return {
      sent: notifications.length,
      total: students.length,
      notifications,
    };
  }

  async getPreferences() {
    const instanceId = this.getInstanceId();
    const prefs = await this.prisma.notificationPreference.findMany({
      where: { instanceId },
    });
    return prefs;
  }

  async updatePreference(type: string, dto: UpdateNotificationPreferenceDto) {
    const instanceId = this.getInstanceId();
    return this.prisma.notificationPreference.upsert({
      where: { instanceId_type: { instanceId, type: type as never } },
      create: {
        type: type as never,
        enabled: dto.enabled,
        instanceId,
      },
      update: { enabled: dto.enabled },
    });
  }

  async getStats() {
    const instanceId = this.getInstanceId();
    const [total, sent, failed, pending] = await Promise.all([
      this.prisma.notification.count({ where: { instanceId } }),
      this.prisma.notification.count({ where: { instanceId, status: 'SENT' } }),
      this.prisma.notification.count({
        where: { instanceId, status: 'FAILED' },
      }),
      this.prisma.notification.count({
        where: { instanceId, status: 'PENDING' },
      }),
    ]);

    const byType = await this.prisma.notification.groupBy({
      by: ['type'],
      where: { instanceId },
      _count: true,
    });

    return {
      total,
      sent,
      failed,
      pending,
      byType: byType.map((b) => ({ type: b.type, count: b._count })),
    };
  }
}
