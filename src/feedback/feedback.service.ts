import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  private getTenantData() {
    const ctx = TenantContext.get();
    if (!ctx?.instanceId)
      throw new ForbiddenException('Tenant context not found');
    return ctx;
  }

  async create(dto: CreateFeedbackDto) {
    const ctx = this.getTenantData();
    const senderName = ctx.teacherId
      ? await this.getTeacherName(ctx.teacherId)
      : 'Student';

    return this.prisma.feedback.create({
      data: {
        content: dto.content,
        category: dto.category ?? 'GENERAL',
        senderRole: ctx.role === 'student' ? 'STUDENT' : 'TEACHER',
        senderId: ctx.teacherId ?? ctx.instanceId,
        senderName,
        instanceId: ctx.instanceId,
      },
    });
  }

  private async getTeacherName(teacherId: string): Promise<string> {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      select: { name: true },
    });
    return teacher?.name ?? 'Teacher';
  }
}
