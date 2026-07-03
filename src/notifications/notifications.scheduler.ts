import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { TierFeatureService } from '../common/services/tier-feature.service';
import { WhatsAppService } from './whatsapp/whatsapp.service';

@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppService: WhatsAppService,
    private readonly tierFeatureService: TierFeatureService,
  ) {}

  @Cron('0 8 * * *')
  async sendSessionReminders() {
    this.logger.log('Running session reminder cron job');

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const sessions = await this.prisma.session.findMany({
      where: {
        startTime: { gte: now, lte: tomorrow },
      },
      include: {
        course: {
          include: {
            enrollments: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    instanceId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const session of sessions) {
      const instanceId = session.instanceId;
      if (!this.whatsAppService.isConnected(instanceId)) continue;

      try {
        await this.tierFeatureService.requireFeature(
          instanceId,
          'sessionNotifications',
        );
      } catch {
        continue;
      }

      const pref = await this.prisma.notificationPreference.findUnique({
        where: { instanceId_type: { instanceId, type: 'SESSION_REMINDER' } },
      });
      if (pref && !pref.enabled) continue;

      for (const enrollment of session.course.enrollments) {
        const student = enrollment.student;
        if (!student.phone || student.instanceId !== instanceId) continue;

        const time = session.startTime.toLocaleString('ar-EG');
        const message = `*⏰ تذكير: ${session.title}*\n\n📅 ${time}\n\nلديك جلسة اليوم. لا تنسَ الحضور!`;

        try {
          const jid = `${student.phone}@s.whatsapp.net`;
          await this.whatsAppService.sendMessage(instanceId, jid, {
            text: message,
          });
        } catch (error) {
          this.logger.error(
            `Failed to send reminder to ${student.phone}: ${(error as Error).message}`,
          );
        }
      }
    }
  }

  @Cron('0 9 * * *')
  async sendAssignmentDueWarnings() {
    this.logger.log('Running assignment due warning cron job');

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const assignments = await this.prisma.assignment.findMany({
      where: {
        dueDate: { gte: now, lte: tomorrow },
      },
      include: {
        course: {
          include: {
            enrollments: {
              include: {
                student: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    instanceId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    for (const assignment of assignments) {
      const instanceId = assignment.instanceId;
      if (!this.whatsAppService.isConnected(instanceId)) continue;

      try {
        await this.tierFeatureService.requireFeature(
          instanceId,
          'sessionNotifications',
        );
      } catch {
        continue;
      }

      const pref = await this.prisma.notificationPreference.findUnique({
        where: { instanceId_type: { instanceId, type: 'ASSIGNMENT_DUE' } },
      });
      if (pref && !pref.enabled) continue;

      const submittedStudentIds = new Set(
        (
          await this.prisma.studentAssignmentSubmission.findMany({
            where: { assignmentId: assignment.id },
            select: { studentId: true },
          })
        ).map((s) => s.studentId),
      );

      for (const enrollment of assignment.course.enrollments) {
        const student = enrollment.student;
        if (!student.phone || student.instanceId !== instanceId) continue;
        if (submittedStudentIds.has(student.id)) continue;

        const dueDate = assignment.dueDate!.toLocaleString('ar-EG');
        const message = `*📋 تذكير: ${assignment.title}*\n\n⏰ الموعد النهائي: ${dueDate}\n\nلم تقم بتسليم الواجب بعد. يرجى التسليم قبل انتهاء الموعد.`;

        try {
          const jid = `${student.phone}@s.whatsapp.net`;
          await this.whatsAppService.sendMessage(instanceId, jid, {
            text: message,
          });
        } catch (error) {
          this.logger.error(
            `Failed to send assignment warning to ${student.phone}: ${(error as Error).message}`,
          );
        }
      }
    }
  }

  @Cron('*/5 * * * *')
  async processPendingNotifications() {
    this.logger.log('Running pending notifications processor');

    const pending = await this.prisma.notification.findMany({
      where: {
        status: 'PENDING',
        recipientPhone: { not: null },
      },
      include: {
        logs: {
          where: { status: 'FAILED' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      take: 50,
    });

    for (const notification of pending) {
      const instanceId = notification.instanceId;
      const phone = notification.recipientPhone!;
      const lastAttempt = notification.logs[0];
      const attemptCount = lastAttempt ? lastAttempt.attempts : 0;

      if (attemptCount >= 3) {
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'FAILED' },
        });
        continue;
      }

      if (!this.whatsAppService.isConnected(instanceId)) continue;

      const pref = await this.prisma.notificationPreference.findUnique({
        where: {
          instanceId_type: { instanceId, type: notification.type as never },
        },
      });
      if (pref && !pref.enabled) {
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'FAILED' },
        });
        continue;
      }

      const jid = `${phone}@s.whatsapp.net`;
      const message = `*${notification.title}*\n\n${notification.body}`;

      try {
        await this.whatsAppService.sendMessage(instanceId, jid, {
          text: message,
        });

        await this.prisma.notificationLog.create({
          data: {
            notificationId: notification.id,
            recipientPhone: phone,
            status: 'SENT',
            attempts: attemptCount + 1,
            lastAttemptedAt: new Date(),
          },
        });

        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'SENT' },
        });

        this.logger.log(
          `Pending notification ${notification.id} sent to ${phone}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send pending notification ${notification.id} to ${phone}: ${(error as Error).message}`,
        );

        const newAttempts = attemptCount + 1;
        await this.prisma.notificationLog.create({
          data: {
            notificationId: notification.id,
            recipientPhone: phone,
            status: 'FAILED',
            error: (error as Error).message,
            attempts: newAttempts,
            lastAttemptedAt: new Date(),
          },
        });

        if (newAttempts >= 3) {
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { status: 'FAILED' },
          });
        }
      }
    }
  }

  @Cron('0 */2 * * *')
  async retryFailedNotifications() {
    this.logger.log('Running failed notification retry cron job');

    const failedLogs = await this.prisma.notificationLog.findMany({
      where: {
        status: 'FAILED',
        attempts: { lt: 3 },
      },
      include: { notification: true },
      take: 100,
    });

    for (const log of failedLogs) {
      const instanceId = log.notification.instanceId;
      if (!this.whatsAppService.isConnected(instanceId)) continue;

      const pref = await this.prisma.notificationPreference.findUnique({
        where: {
          instanceId_type: { instanceId, type: log.notification.type as never },
        },
      });
      if (pref && !pref.enabled) continue;

      const jid = `${log.recipientPhone}@s.whatsapp.net`;
      const message = `*${log.notification.title}*\n\n${log.notification.body}`;

      try {
        await this.whatsAppService.sendMessage(instanceId, jid, {
          text: message,
        });

        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            status: 'SENT',
            attempts: { increment: 1 },
            lastAttemptedAt: new Date(),
            error: null,
          },
        });
      } catch (error) {
        await this.prisma.notificationLog.update({
          where: { id: log.id },
          data: {
            attempts: { increment: 1 },
            lastAttemptedAt: new Date(),
            error: (error as Error).message,
          },
        });

        if (log.attempts + 1 >= 3) {
          await this.prisma.notification.update({
            where: { id: log.notificationId },
            data: { status: 'FAILED' },
          });
        }
      }
    }
  }
}
