import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from './progress.service';
import { TenantContext } from '../common/context/tenant-context';

@Injectable()
export class SessionCompleteScheduler {
  private readonly logger = new Logger(SessionCompleteScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: ProgressService,
  ) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async markCompletedSessions() {
    this.logger.log('Checking for sessions that have ended...');

    const now = new Date();

    const elements = await this.prisma.curriculumElement.findMany({
      where: {
        type: 'SESSION',
        session: {
          endTime: { lte: now },
        },
      },
      select: {
        id: true,
        curriculumId: true,
        instanceId: true,
        curriculum: {
          select: {
            course: {
              select: {
                enrollments: {
                  select: { studentId: true },
                },
              },
            },
          },
        },
      },
    });

    for (const element of elements) {
      const studentIds = element.curriculum.course.enrollments.map(
        (e) => e.studentId,
      );

      for (const studentId of studentIds) {
        const existing = await this.prisma.elementProgress.findUnique({
          where: {
            studentId_elementId: { studentId, elementId: element.id },
          },
        });

        if (existing?.status === 'COMPLETED') continue;

        await TenantContext.runWithContext(
          { instanceId: element.instanceId },
          async () => {
            await this.progressService.completeElement(element.id, studentId);
          },
        );
      }
    }

    if (elements.length > 0) {
      this.logger.log(
        `Completed progress for ${elements.length} session elements`,
      );
    }
  }
}
