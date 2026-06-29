import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  async create(dto: CreateCourseDto) {
    const instanceId = this.getInstanceId();

    const group = await this.prisma.group.findFirst({
      where: { id: dto.groupId, instanceId },
    });
    if (!group) throw new NotFoundException('Group not found');

    return this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        price: dto.price ?? 0,
        groupId: dto.groupId,
        instanceId,
      },
    });
  }

  async assertStudentEnrolled(courseId: string, studentId: string) {
    const instanceId = this.getInstanceId();
    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: { courseId, studentId, instanceId },
    });
    if (!enrollment)
      throw new ForbiddenException('You are not enrolled in this course');
  }

  async findAll(groupId?: string, user?: { id: string; role: string }) {
    const instanceId = this.getInstanceId();

    const where: Prisma.CourseWhereInput = { instanceId };
    if (groupId) {
      const group = await this.prisma.group.findFirst({
        where: { id: groupId, instanceId },
      });
      if (!group) throw new NotFoundException('Group not found');
      where.groupId = groupId;
    }

    const courses = await this.prisma.course.findMany({
      where,
      include: {
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let enrolledCourseIds: Set<string> | undefined;
    if (user?.role === 'student') {
      const enrollments = await this.prisma.courseEnrollment.findMany({
        where: { studentId: user.id, instanceId },
        select: { courseId: true },
      });
      enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));
    }

    const data = courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      price: c.price,
      groupId: c.groupId,
      instanceId: c.instanceId,
      studentCount: { total: c._count.enrollments },
      isEnrolled: enrolledCourseIds?.has(c.id) ?? false,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));

    return { data, total: courses.length };
  }

  async findOne(id: string, user?: { id: string; role: string }) {
    const instanceId = this.getInstanceId();
    const course = await this.prisma.course.findFirst({
      where: { id, instanceId },
      include: {
        _count: { select: { enrollments: true } },
      },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (user?.role === 'student') {
      await this.assertStudentEnrolled(id, user.id);
    }

    const curriculum = await this.prisma.curriculum.findFirst({
      where: { courseId: id, instanceId },
      select: { id: true },
    });

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      price: course.price,
      groupId: course.groupId,
      instanceId: course.instanceId,
      studentCount: { total: course._count.enrollments },
      isEnrolled: user?.role === 'student' ? true : undefined,
      curriculum: curriculum ? { id: curriculum.id } : null,
      createdAt: course.createdAt.toISOString(),
      updatedAt: course.updatedAt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateCourseDto) {
    await this.findOne(id);

    return this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
      },
    });
  }

  async remove(id: string) {
    const instanceId = this.getInstanceId();
    const course = await this.prisma.course.findFirst({
      where: { id, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    await this.prisma.course.delete({ where: { id } });
  }

  async enroll(id: string, dto: CreateEnrollmentDto) {
    const instanceId = this.getInstanceId();

    const course = await this.prisma.course.findFirst({
      where: { id, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const students = await this.prisma.student.findMany({
      where: {
        id: { in: dto.studentIds },
        instanceId,
        groupId: course.groupId,
      },
    });

    if (students.length !== dto.studentIds.length) {
      const foundIds = new Set(students.map((s) => s.id));
      const missing = dto.studentIds.filter((sid) => !foundIds.has(sid));
      throw new BadRequestException(
        `Students not found or not in the same group: ${missing.join(', ')}`,
      );
    }

    const enrollments = await Promise.all(
      dto.studentIds.map((studentId) =>
        this.prisma.courseEnrollment.upsert({
          where: {
            studentId_courseId: { studentId, courseId: id },
          },
          update: {},
          create: { studentId, courseId: id, instanceId },
          include: {
            student: { select: { id: true, name: true, email: true } },
          },
        }),
      ),
    );

    const data = enrollments.map((e) => ({
      id: e.id,
      courseId: e.courseId,
      studentId: e.studentId,
      student: e.student,
      enrolledAt: e.enrolledAt.toISOString(),
    }));

    return { data, total: data.length };
  }

  async unenroll(courseId: string, studentId: string) {
    const instanceId = this.getInstanceId();

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const enrollment = await this.prisma.courseEnrollment.findFirst({
      where: { courseId, studentId, instanceId },
    });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    await this.prisma.courseEnrollment.delete({
      where: { id: enrollment.id },
    });
  }

  async findEnrollments(courseId: string) {
    const instanceId = this.getInstanceId();

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const enrollments = await this.prisma.courseEnrollment.findMany({
      where: { courseId, instanceId },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
      orderBy: { enrolledAt: 'desc' },
    });

    const data = enrollments.map((e) => ({
      id: e.id,
      courseId: e.courseId,
      studentId: e.studentId,
      student: e.student,
      enrolledAt: e.enrolledAt.toISOString(),
    }));

    return { data, total: data.length };
  }
}
