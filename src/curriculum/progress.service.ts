import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  async startElement(elementId: string, studentId: string) {
    const element = await this.prisma.curriculumElement.findFirst({
      where: { id: elementId, instanceId: this.getInstanceId() },
    });
    if (!element) throw new NotFoundException('Element not found');

    const existing = await this.prisma.elementProgress.findUnique({
      where: { studentId_elementId: { studentId, elementId } },
    });

    if (existing) {
      return existing;
    }

    const progress = await this.prisma.elementProgress.create({
      data: {
        studentId,
        elementId,
        instanceId: element.instanceId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
      },
    });

    return progress;
  }

  async updateProgress(
    elementId: string,
    studentId: string,
    progressPercent: number,
  ) {
    const element = await this.prisma.curriculumElement.findFirst({
      where: { id: elementId, instanceId: this.getInstanceId() },
    });
    if (!element) throw new NotFoundException('Element not found');

    const existing = await this.prisma.elementProgress.findUnique({
      where: { studentId_elementId: { studentId, elementId } },
    });

    let status: 'COMPLETED' | 'IN_PROGRESS' = progressPercent >= 95 ? 'COMPLETED' : 'IN_PROGRESS';
    let completedAt = status === 'COMPLETED' ? new Date() : null;

    if (existing?.status === 'COMPLETED') {
      status = 'COMPLETED';
      completedAt = existing.completedAt;
    }

    const progress = await this.prisma.elementProgress.upsert({
      where: { studentId_elementId: { studentId, elementId } },
      create: {
        studentId,
        elementId,
        instanceId: element.instanceId,
        status: status,
        progressPercent,
        startedAt: completedAt ? new Date() : new Date(),
        completedAt,
      },
      update: {
        status: status,
        progressPercent,
        completedAt,
      },
    });

    await this.recomputeCourseProgress(studentId, element.curriculumId);

    return progress;
  }

  async completeElement(elementId: string, studentId: string) {
    const element = await this.prisma.curriculumElement.findFirst({
      where: { id: elementId, instanceId: this.getInstanceId() },
    });
    if (!element) throw new NotFoundException('Element not found');

    const progress = await this.prisma.elementProgress.upsert({
      where: { studentId_elementId: { studentId, elementId } },
      create: {
        studentId,
        elementId,
        instanceId: element.instanceId,
        status: 'COMPLETED',
        progressPercent: 100,
        startedAt: new Date(),
        completedAt: new Date(),
      },
      update: {
        status: 'COMPLETED',
        progressPercent: 100,
        completedAt: new Date(),
      },
    });

    await this.recomputeCourseProgress(studentId, element.curriculumId);

    return progress;
  }

  async getElementProgress(elementId: string, studentId: string) {
    const progress = await this.prisma.elementProgress.findUnique({
      where: { studentId_elementId: { studentId, elementId } },
    });

    if (!progress) {
      return {
        status: 'NOT_STARTED' as const,
        progressPercent: 0,
        startedAt: null,
        completedAt: null,
      };
    }

    return progress;
  }

  async getCurriculumProgress(curriculumId: string, studentId: string) {
    const instanceId = this.getInstanceId();
    const elements = await this.prisma.curriculumElement.findMany({
      where: { curriculumId, instanceId },
      select: { id: true, required: true },
    });

    const progressRows = await this.prisma.elementProgress.findMany({
      where: {
        studentId,
        elementId: { in: elements.map((e) => e.id) },
        instanceId,
      },
    });

    const progressMap = new Map(progressRows.map((p) => [p.elementId, p]));

    const elementProgress = elements.map((el) => {
      const p = progressMap.get(el.id);
      return {
        elementId: el.id,
        status: p?.status ?? 'NOT_STARTED',
        progressPercent: p?.progressPercent ?? 0,
        completedAt: p?.completedAt ?? null,
      };
    });

    await this.recomputeCourseProgress(studentId, curriculumId);

    const courseProgress = await this.getCourseProgressByCurriculum(
      studentId,
      curriculumId,
    );

    return { elementProgress, courseProgress };
  }

  async getCourseProgress(studentId: string, courseId: string) {
    return this.prisma.courseProgress.findUnique({
      where: { studentId_courseId: { studentId, courseId } },
    });
  }

  async getStudentCourseProgress(courseId: string, studentId: string) {
    const instanceId = this.getInstanceId();

    const curriculum = await this.prisma.curriculum.findFirst({
      where: { courseId, instanceId },
    });
    if (!curriculum) return null;

    const courseProgress = await this.recomputeCourseProgress(
      studentId,
      curriculum.id,
    );

    return courseProgress;
  }

  private async getCourseProgressByCurriculum(
    studentId: string,
    curriculumId: string,
  ) {
    const curriculum = await this.prisma.curriculum.findFirst({
      where: { id: curriculumId },
      select: { courseId: true },
    });
    if (!curriculum) return null;

    return this.prisma.courseProgress.findUnique({
      where: {
        studentId_courseId: {
          studentId,
          courseId: curriculum.courseId,
        },
      },
    });
  }

  async recomputeCourseProgress(
    studentId: string,
    curriculumId: string,
  ): Promise<{
    totalRequired: number;
    completedRequired: number;
    percent: number;
  } | null> {
    const curriculum = await this.prisma.curriculum.findFirst({
      where: { id: curriculumId },
      select: { courseId: true, id: true },
    });
    if (!curriculum) return null;

    const elements = await this.prisma.curriculumElement.findMany({
      where: { curriculumId, instanceId: this.getInstanceId() },
      select: { id: true, required: true },
    });

    const requiredElements = elements.filter((e) => e.required);
    const totalRequired = requiredElements.length;

    if (totalRequired === 0) {
      await this.prisma.courseProgress.upsert({
        where: {
          studentId_courseId: { studentId, courseId: curriculum.courseId },
        },
        create: {
          studentId,
          courseId: curriculum.courseId,
          instanceId: this.getInstanceId(),
          totalRequired: 0,
          completedRequired: 0,
          percent: 0,
        },
        update: {
          totalRequired: 0,
          completedRequired: 0,
          percent: 0,
        },
      });
      return { totalRequired: 0, completedRequired: 0, percent: 0 };
    }

    const completedRows = await this.prisma.elementProgress.count({
      where: {
        studentId,
        elementId: { in: requiredElements.map((e) => e.id) },
        status: 'COMPLETED',
      },
    });

    const completedRequired = completedRows;
    const percent = Math.round((completedRequired / totalRequired) * 100);

    await this.prisma.courseProgress.upsert({
      where: {
        studentId_courseId: { studentId, courseId: curriculum.courseId },
      },
      create: {
        studentId,
        courseId: curriculum.courseId,
        instanceId: this.getInstanceId(),
        totalRequired,
        completedRequired,
        percent,
      },
      update: {
        totalRequired,
        completedRequired,
        percent,
      },
    });

    return { totalRequired, completedRequired, percent };
  }
}
