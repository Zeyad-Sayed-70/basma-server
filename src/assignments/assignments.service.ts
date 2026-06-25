import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MinioService } from '../minio/minio.service';
import { TenantContext } from '../common/context/tenant-context';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minio: MinioService,
  ) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  async create(dto: CreateAssignmentDto) {
    const instanceId = this.getInstanceId();

    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    return this.prisma.assignment.create({
      data: {
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        courseId: dto.courseId,
        instanceId,
      },
    });
  }

  async findAll(courseId?: string) {
    const instanceId = this.getInstanceId();

    const where: Record<string, unknown> = { instanceId };
    if (courseId) {
      const course = await this.prisma.course.findFirst({
        where: { id: courseId, instanceId },
      });
      if (!course) throw new NotFoundException('Course not found');
      where.courseId = courseId;
    }

    const assignments = await this.prisma.assignment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const data = assignments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      dueDate: a.dueDate?.toISOString() ?? null,
      courseId: a.courseId,
      instanceId: a.instanceId,
      createdAt: a.createdAt.toISOString(),
      updatedAt: a.updatedAt.toISOString(),
    }));

    return { data, total: assignments.length };
  }

  async findOne(id: string) {
    const instanceId = this.getInstanceId();
    const assignment = await this.prisma.assignment.findFirst({
      where: { id, instanceId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      dueDate: assignment.dueDate?.toISOString() ?? null,
      courseId: assignment.courseId,
      instanceId: assignment.instanceId,
      createdAt: assignment.createdAt.toISOString(),
      updatedAt: assignment.updatedAt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateAssignmentDto) {
    await this.findOne(id);

    return this.prisma.assignment.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
      },
    });
  }

  async remove(id: string) {
    const instanceId = this.getInstanceId();
    const assignment = await this.prisma.assignment.findFirst({
      where: { id, instanceId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    await this.prisma.assignment.delete({ where: { id } });
  }

  async submit(
    assignmentId: string,
    studentId: string,
    content?: string,
    file?: Express.Multer.File,
  ) {
    const instanceId = this.getInstanceId();

    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, instanceId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const existing = await this.prisma.studentAssignmentSubmission.findUnique({
      where: { studentId_assignmentId: { studentId, assignmentId } },
    });
    if (existing) {
      throw new ConflictException('Already submitted — use PATCH to resubmit');
    }

    let fileUrl: string | undefined;
    if (file) {
      const objectPath = `assignments/${instanceId}/${assignmentId}/${studentId}/${file.originalname}`;
      await this.minio.uploadBuffer(file.buffer, objectPath, file.mimetype);
      fileUrl = this.minio.getObjectUrl(objectPath);
    }

    const submission = await this.prisma.studentAssignmentSubmission.create({
      data: {
        studentId,
        assignmentId,
        content,
        fileUrl,
        instanceId,
      },
    });

    return {
      id: submission.id,
      studentId: submission.studentId,
      assignmentId: submission.assignmentId,
      content: submission.content,
      fileUrl: submission.fileUrl,
      grade: submission.grade,
      feedback: submission.feedback,
      submittedAt: submission.submittedAt.toISOString(),
    };
  }

  async findSubmissions(assignmentId: string) {
    const instanceId = this.getInstanceId();

    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, instanceId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    const submissions = await this.prisma.studentAssignmentSubmission.findMany({
      where: { assignmentId, instanceId },
      orderBy: { submittedAt: 'desc' },
    });

    const data = submissions.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      assignmentId: s.assignmentId,
      content: s.content,
      fileUrl: s.fileUrl,
      grade: s.grade,
      feedback: s.feedback,
      submittedAt: s.submittedAt.toISOString(),
    }));

    return { data, total: submissions.length };
  }

  async findSubmission(assignmentId: string, studentId: string) {
    const instanceId = this.getInstanceId();

    const submission = await this.prisma.studentAssignmentSubmission.findUnique(
      {
        where: { studentId_assignmentId: { studentId, assignmentId } },
      },
    );
    if (!submission) throw new NotFoundException('Submission not found');

    if (submission.instanceId !== instanceId) {
      throw new NotFoundException('Submission not found');
    }

    return {
      id: submission.id,
      studentId: submission.studentId,
      assignmentId: submission.assignmentId,
      content: submission.content,
      fileUrl: submission.fileUrl,
      grade: submission.grade,
      feedback: submission.feedback,
      submittedAt: submission.submittedAt.toISOString(),
    };
  }

  async grade(
    assignmentId: string,
    studentId: string,
    dto: GradeSubmissionDto,
  ) {
    const instanceId = this.getInstanceId();

    const submission = await this.prisma.studentAssignmentSubmission.findUnique(
      {
        where: { studentId_assignmentId: { studentId, assignmentId } },
      },
    );
    if (!submission) throw new NotFoundException('Submission not found');

    if (submission.instanceId !== instanceId) {
      throw new NotFoundException('Submission not found');
    }

    const updated = await this.prisma.studentAssignmentSubmission.update({
      where: { id: submission.id },
      data: {
        grade: dto.grade,
        ...(dto.feedback !== undefined && { feedback: dto.feedback }),
      },
    });

    return {
      id: updated.id,
      studentId: updated.studentId,
      assignmentId: updated.assignmentId,
      content: updated.content,
      fileUrl: updated.fileUrl,
      grade: updated.grade,
      feedback: updated.feedback,
      submittedAt: updated.submittedAt.toISOString(),
    };
  }
}
