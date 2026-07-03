import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { TierFeatureService } from '../../common/services/tier-feature.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class SessionCreatedListener {
  private readonly logger = new Logger(SessionCreatedListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
    private readonly tierFeatureService: TierFeatureService,
  ) {}

  @OnEvent('session.created')
  async handle(payload: {
    sessionId: string;
    title: string;
    startTime: Date;
    courseId: string;
    instanceId: string;
  }) {
    try {
      const pref = await this.prisma.notificationPreference.findUnique({
        where: {
          instanceId_type: {
            instanceId: payload.instanceId,
            type: 'SESSION_REMINDER',
          },
        },
      });

      if (pref && !pref.enabled) return;

      try {
        await this.tierFeatureService.requireFeature(
          payload.instanceId,
          'sessionNotifications',
        );
      } catch {
        return;
      }

      if (!this.whatsAppService.isConnected(payload.instanceId)) return;

      const enrolledStudents = await this.prisma.courseEnrollment.findMany({
        where: { courseId: payload.courseId },
        include: {
          student: { select: { id: true, name: true, phone: true } },
        },
      });

      for (const enrollment of enrolledStudents) {
        const student = enrollment.student;
        if (!student.phone) continue;

        const title = payload.title;
        const time = new Date(payload.startTime).toLocaleString('ar-EG');
        const message = `*📚 جلسة جديدة: ${title}*\n\n⏰ ${time}\n\nتم إنشاء جلسة جديدة. يرجى الحضور في الموعد المحدد.`;

        try {
          const jid = `${student.phone}@s.whatsapp.net`;
          await this.whatsAppService.sendMessage(payload.instanceId, jid, {
            text: message,
          });

          const notification = await this.prisma.notification.create({
            data: {
              type: 'SESSION_REMINDER',
              title: `جلسة جديدة: ${title}`,
              body: message,
              recipientPhone: student.phone,
              status: 'SENT',
              instanceId: payload.instanceId,
            },
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
        } catch (error) {
          this.logger.error(
            `Failed to send session notification to ${student.phone}: ${(error as Error).message}`,
          );

          const notification = await this.prisma.notification.create({
            data: {
              type: 'SESSION_REMINDER',
              title: `جلسة جديدة: ${title}`,
              body: message,
              recipientPhone: student.phone,
              status: 'FAILED',
              instanceId: payload.instanceId,
            },
          });

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
        }
      }
    } catch (error) {
      this.logger.error(
        `Error in SessionCreatedListener: ${(error as Error).message}`,
      );
    }
  }
}
