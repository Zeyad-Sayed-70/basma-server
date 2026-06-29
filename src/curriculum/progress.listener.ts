import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { ProgressService } from './progress.service';
import { TenantContext } from '../common/context/tenant-context';

@Injectable()
export class ProgressListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly progressService: ProgressService,
  ) {}

  @OnEvent('quiz.graded')
  async handleQuizGraded(payload: {
    instanceId: string;
    quizId: string;
    studentId: string;
  }) {
    await TenantContext.runWithContext(
      { instanceId: payload.instanceId },
      async () => {
        const element = await this.prisma.curriculumElement.findFirst({
          where: { quizId: payload.quizId, instanceId: payload.instanceId },
          select: { id: true, curriculumId: true },
        });
        if (!element) return;

        await this.progressService.completeElement(
          element.id,
          payload.studentId,
        );
      },
    );
  }

  @OnEvent('assignment.graded')
  async handleAssignmentGraded(payload: {
    instanceId: string;
    assignmentId: string;
    studentId: string;
  }) {
    await TenantContext.runWithContext(
      { instanceId: payload.instanceId },
      async () => {
        const element = await this.prisma.curriculumElement.findFirst({
          where: {
            assignmentId: payload.assignmentId,
            instanceId: payload.instanceId,
          },
          select: { id: true, curriculumId: true },
        });
        if (!element) return;

        await this.progressService.completeElement(
          element.id,
          payload.studentId,
        );
      },
    );
  }
}
