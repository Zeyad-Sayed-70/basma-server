import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';
import { CreateCurriculumDto } from './dto/create-curriculum.dto';
import { UpdateCurriculumDto } from './dto/update-curriculum.dto';

@Injectable()
export class CurriculumService {
  constructor(private readonly prisma: PrismaService) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  async create(courseId: string, dto?: CreateCurriculumDto) {
    const instanceId = this.getInstanceId();

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.curriculum.upsert({
      where: { courseId },
      create: {
        courseId,
        instanceId,
        title: dto?.title ?? course.title,
      },
      update: {},
      include: { _count: { select: { elements: true } } },
    });
  }

  async findByCourse(courseId: string, studentId?: string) {
    const instanceId = this.getInstanceId();

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const curriculum = await this.prisma.curriculum.findFirst({
      where: { courseId },
      include: {
        elements: {
          orderBy: { position: 'asc' },
          include: {
            video: true,
            richContent: true,
            file: true,
            quiz: { select: { id: true, title: true } },
            assignment: { select: { id: true, title: true } },
            session: {
              select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                type: true,
                location: true,
                platform: true,
                meetingUrl: true,
              },
            },
          },
        },
      },
    });

    if (!curriculum) {
      return null;
    }

    let progressMap = new Map<string, { status: string; progressPercent: number; completedAt: Date | null }>();
    let courseProgressData = null;

    if (studentId) {
      const progressRows = await this.prisma.elementProgress.findMany({
        where: { studentId, elementId: { in: curriculum.elements.map((e) => e.id) } },
        select: { elementId: true, status: true, progressPercent: true, completedAt: true },
      });
      progressMap = new Map(progressRows.map((p) => [p.elementId, p]));

      courseProgressData = await this.prisma.courseProgress.findUnique({
        where: { studentId_courseId: { studentId, courseId } },
      });
    }

    const elementsWithProgress = curriculum.elements.map((el) => {
      const p = progressMap.get(el.id);
      return {
        ...el,
        progress: p
          ? { status: p.status, progressPercent: p.progressPercent, completedAt: p.completedAt }
          : { status: 'NOT_STARTED', progressPercent: 0, completedAt: null },
      };
    });

    return {
      ...curriculum,
      elements: elementsWithProgress,
      courseProgress: courseProgressData,
    };
  }

  async update(id: string, dto: UpdateCurriculumDto) {
    const instanceId = this.getInstanceId();
    const curriculum = await this.prisma.curriculum.findFirst({
      where: { id, instanceId },
    });
    if (!curriculum) throw new NotFoundException('Curriculum not found');

    return this.prisma.curriculum.update({
      where: { id },
      data: { ...(dto.title !== undefined && { title: dto.title }) },
    });
  }

  async remove(id: string) {
    const instanceId = this.getInstanceId();
    const curriculum = await this.prisma.curriculum.findFirst({
      where: { id, instanceId },
    });
    if (!curriculum) throw new NotFoundException('Curriculum not found');

    const elements = await this.prisma.curriculumElement.findMany({
      where: { curriculumId: id },
      select: {
        id: true,
        video: { select: { fileObjectKey: true } },
        file: { select: { fileObjectKey: true } },
      },
    });

    await this.prisma.curriculum.delete({ where: { id } });

    return elements;
  }

  async getCurriculumSummary(courseId: string) {
    const curriculum = await this.findByCourse(courseId);
    if (!curriculum) return null;

    return {
      id: curriculum.id,
      courseId: curriculum.courseId,
      title: curriculum.title,
      totalElements: curriculum.elements.length,
    };
  }
}
