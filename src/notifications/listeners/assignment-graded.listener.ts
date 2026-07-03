import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { TierFeatureService } from '../../common/services/tier-feature.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class AssignmentGradedListener {
  private readonly logger = new Logger(AssignmentGradedListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
    private readonly tierFeatureService: TierFeatureService,
  ) {}

  @OnEvent('assignment.graded')
  async handle(payload: {
    assignmentId: string;
    assignmentTitle: string;
    studentId: string;
    grade: number;
    feedback?: string;
    instanceId: string;
  }) {
    try {
      const pref = await this.prisma.notificationPreference.findUnique({
        where: {
          instanceId_type: {
            instanceId: payload.instanceId,
            type: 'ASSIGNMENT_DUE',
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

      const student = await this.prisma.student.findFirst({
        where: { id: payload.studentId, instanceId: payload.instanceId },
        select: { phone: true, name: true },
      });

      if (!student?.phone) return;

      let message = `*📋 نتيجة الواجب: ${payload.assignmentTitle}*\n\nالدرجة: ${payload.grade}`;
      if (payload.feedback) {
        message += `\n\nملاحظات: ${payload.feedback}`;
      }

      try {
        const jid = `${student.phone}@s.whatsapp.net`;
        await this.whatsAppService.sendMessage(payload.instanceId, jid, {
          text: message,
        });

        const notification = await this.prisma.notification.create({
          data: {
            type: 'ASSIGNMENT_DUE',
            title: `نتيجة الواجب: ${payload.assignmentTitle}`,
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
          `Failed to send assignment graded notification: ${(error as Error).message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error in AssignmentGradedListener: ${(error as Error).message}`,
      );
    }
  }
}
