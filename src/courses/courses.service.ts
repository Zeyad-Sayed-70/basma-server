import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { TenantContext } from '../common/context/tenant-context';
import { TierFeatureService } from '../common/services/tier-feature.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
    private readonly tierFeatureService: TierFeatureService,
  ) {}

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

    const coursesCount = await this.prisma.course.count({
      where: { instanceId },
    });
    await this.tierFeatureService.checkResource(
      instanceId,
      'courses',
      coursesCount,
    );

    const course = await this.prisma.course.create({
      data: {
        title: dto.title,
        description: dto.description,
        price: dto.price ?? 0,
        groupId: dto.groupId,
        instanceId,
      },
    });

    if (course.price === 0) {
      const students = await this.prisma.student.findMany({
        where: { groupId: dto.groupId, instanceId },
        select: { id: true },
      });
      if (students.length > 0) {
        await this.prisma.courseEnrollment.createMany({
          data: students.map((s) => ({
            studentId: s.id,
            courseId: course.id,
            instanceId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return course;
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
      imageUrl: c.imageUrl,
      imageFileSize: c.imageFileSize,
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
      imageUrl: course.imageUrl,
      imageFileSize: course.imageFileSize,
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
    const instanceId = this.getInstanceId();
    const course = await this.prisma.course.findFirst({
      where: { id, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const updated = await this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
      },
    });

    if (updated.price === 0 && course.price !== 0) {
      const students = await this.prisma.student.findMany({
        where: { groupId: updated.groupId, instanceId },
        select: { id: true },
      });
      if (students.length > 0) {
        await this.prisma.courseEnrollment.createMany({
          data: students.map((s) => ({
            studentId: s.id,
            courseId: updated.id,
            instanceId,
          })),
          skipDuplicates: true,
        });
      }
    }

    return updated;
  }

  async remove(id: string) {
    const instanceId = this.getInstanceId();
    const course = await this.prisma.course.findFirst({
      where: { id, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    await this.prisma.course.delete({ where: { id } });
  }

  async uploadImage(id: string, file: Express.Multer.File) {
    const instanceId = this.getInstanceId();

    const course = await this.prisma.course.findFirst({
      where: { id, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (course.imageUrl) {
      try {
        await this.minio.deleteObject(course.imageUrl);
      } catch {
        // ignore if old file no longer exists
      }
    }

    const ext = file.originalname.split('.').pop() ?? 'png';
    const objectPath = `${instanceId}/courses/${id}/${Date.now()}.${ext}`;
    await this.minio.uploadBuffer(file.buffer, objectPath, file.mimetype);
    const imageUrl = this.minio.getObjectUrl(objectPath);

    return this.prisma.course.update({
      where: { id },
      data: { imageUrl, imageFileSize: file.buffer.length },
    });
  }

  async removeImage(id: string) {
    const instanceId = this.getInstanceId();

    const course = await this.prisma.course.findFirst({
      where: { id, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (course.imageUrl) {
      try {
        await this.minio.deleteObject(course.imageUrl);
      } catch {
        // ignore if old file no longer exists
      }
    }

    return this.prisma.course.update({
      where: { id },
      data: { imageUrl: null, imageFileSize: null },
    });
  }

  async selfEnroll(courseId: string, studentId: string) {
    const instanceId = this.getInstanceId();

    const course = await this.prisma.course.findFirst({
      where: { id: courseId, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    if (course.price !== 0) {
      throw new BadRequestException(
        'This course is not free. Use the payment flow to enroll.',
      );
    }

    const student = await this.prisma.student.findFirst({
      where: { id: studentId, instanceId, groupId: course.groupId },
    });
    if (!student) {
      throw new ForbiddenException(
        'Student does not have access to this course',
      );
    }

    const enrollment = await this.prisma.courseEnrollment.upsert({
      where: {
        studentId_courseId: { studentId, courseId },
      },
      update: {},
      create: { studentId, courseId, instanceId },
      include: {
        student: { select: { id: true, name: true, email: true } },
      },
    });

    return {
      id: enrollment.id,
      courseId: enrollment.courseId,
      studentId: enrollment.studentId,
      student: enrollment.student,
      enrolledAt: enrollment.enrolledAt.toISOString(),
    };
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
