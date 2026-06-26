import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AgentStudentDataService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertStudentBelongsToInstance(
    instanceId: string,
    studentId: string,
  ) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    if (student.instanceId !== instanceId) {
      throw new ForbiddenException('Cross-instance access denied');
    }
    return student;
  }

  async addNote(
    instanceId: string,
    studentId: string,
    category: string,
    content: string,
    source = 'agent',
    sessionId?: string,
  ) {
    await this.assertStudentBelongsToInstance(instanceId, studentId);

    return this.prisma.agentStudentNote.create({
      data: {
        studentId,
        instanceId,
        category,
        content,
        source,
        sessionId,
      },
    });
  }

  async getNotes(
    instanceId: string,
    studentId: string,
    category?: string,
    limit = 50,
  ) {
    await this.assertStudentBelongsToInstance(instanceId, studentId);

    return this.prisma.agentStudentNote.findMany({
      where: { studentId, instanceId, ...(category ? { category } : {}) },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getProfile(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { agentProfile: true },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student.agentProfile as Record<string, unknown>;
  }

  async updateProfile(studentId: string, profile: Record<string, unknown>) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    await this.prisma.student.update({
      where: { id: studentId },
      data: { agentProfile: profile as Prisma.InputJsonValue },
    });
  }

  async getStudentMemory(instanceId: string, studentId: string) {
    const student = await this.assertStudentBelongsToInstance(
      instanceId,
      studentId,
    );
    const recentNotes = await this.prisma.agentStudentNote.findMany({
      where: { studentId, instanceId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        category: true,
        content: true,
        createdAt: true,
      },
    });

    return {
      profile: student.agentProfile as Record<string, unknown>,
      recentNotes,
    };
  }
}
