import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';

@Injectable()
export class QuizGradedListener {
  private readonly logger = new Logger(QuizGradedListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  @OnEvent('quiz.graded')
  async handle(payload: {
    quizId: string;
    quizTitle: string;
    studentId: string;
    score: number;
    totalMarks: number;
    instanceId: string;
  }) {
    try {
      const pref = await this.prisma.notificationPreference.findUnique({
        where: {
          instanceId_type: {
            instanceId: payload.instanceId,
            type: 'QUIZ_GRADED',
          },
        },
      });

      if (pref && !pref.enabled) return;
      if (!this.whatsAppService.isConnected(payload.instanceId)) return;

      const student = await this.prisma.student.findFirst({
        where: { id: payload.studentId, instanceId: payload.instanceId },
        select: { phone: true, name: true },
      });

      if (!student?.phone) return;

      const message = `*📝 نتيجة الاختبار: ${payload.quizTitle}*\n\nالدرجة: ${payload.score} / ${payload.totalMarks}`;

      try {
        const jid = `${student.phone}@s.whatsapp.net`;
        await this.whatsAppService.sendMessage(payload.instanceId, jid, {
          text: message,
        });

        const notification = await this.prisma.notification.create({
          data: {
            type: 'QUIZ_GRADED',
            title: `نتيجة الاختبار: ${payload.quizTitle}`,
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
          `Failed to send quiz graded notification: ${(error as Error).message}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error in QuizGradedListener: ${(error as Error).message}`,
      );
    }
  }
}
