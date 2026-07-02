import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';
import { TIER_LIMITS } from '../common/constants/tier-limits';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import type {
  BulkImportDto,
  BulkImportResultDto,
  RedeemInvitationDto,
} from './dto/bulk-import.dto';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  private async enforceStudentLimit(instanceId: string): Promise<number> {
    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      include: { _count: { select: { students: true } } },
    });
    if (!instance) throw new NotFoundException('Instance not found');

    const tier = instance.tier;
    const limit = TIER_LIMITS[tier]?.students ?? Infinity;

    return {
      instance,
      limit,
      currentCount: instance._count.students,
    } as unknown as number;
  }

  private async autoEnrollFreeCourses(studentId: string, groupId: string, instanceId: string) {
    const freeCourses = await this.prisma.course.findMany({
      where: { groupId, instanceId, price: 0 },
      select: { id: true },
    });
    if (freeCourses.length > 0) {
      await this.prisma.courseEnrollment.createMany({
        data: freeCourses.map((c) => ({
          studentId,
          courseId: c.id,
          instanceId,
        })),
        skipDuplicates: true,
      });
    }
  }

  async create(dto: CreateStudentDto) {
    const instanceId = this.getInstanceId();

    const group = await this.prisma.group.findFirst({
      where: { id: dto.groupId, instanceId },
    });
    if (!group) throw new NotFoundException('Group not found');

    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      include: { _count: { select: { students: true } } },
    });
    if (!instance) throw new NotFoundException('Instance not found');

    const tier = instance.tier;
    const limit = TIER_LIMITS[tier]?.students ?? Infinity;
    const isOverLimit = instance._count.students >= limit;

    if (dto.email) {
      const existingEmail = await this.prisma.student.findUnique({
        where: { instanceId_email: { instanceId, email: dto.email } },
      });
      if (existingEmail) {
        throw new ConflictException(
          `A student with email "${dto.email}" already exists in this instance`,
        );
      }
    }

    const student = await this.prisma.student.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        status: isOverLimit ? 'INACTIVE' : 'ACTIVE',
        groupId: dto.groupId,
        instanceId,
      },
    });

    await this.autoEnrollFreeCourses(student.id, dto.groupId, instanceId);

    return student;
  }

  async findAll(groupId?: string) {
    const instanceId = this.getInstanceId();

    const where: Record<string, unknown> = { instanceId };
    if (groupId) {
      const group = await this.prisma.group.findFirst({
        where: { id: groupId, instanceId },
      });
      if (!group) throw new NotFoundException('Group not found');
      where.groupId = groupId;
    }

    const students = await this.prisma.student.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
    });
    const tier = instance?.tier ?? 'FREE';
    const limit = TIER_LIMITS[tier]?.students ?? Infinity;

    const active = students.filter((s) => s.status === 'ACTIVE').length;
    const inactive = students.filter((s) => s.status === 'INACTIVE').length;

    const data = students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      status: s.status,
      groupId: s.groupId,
      instanceId: s.instanceId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return {
      data,
      total: students.length,
      summary: { active, inactive, limit },
    };
  }

  async findOne(id: string) {
    const instanceId = this.getInstanceId();
    const student = await this.prisma.student.findFirst({
      where: { id, instanceId },
    });
    if (!student) throw new NotFoundException('Student not found');

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      status: student.status,
      groupId: student.groupId,
      instanceId: student.instanceId,
      createdAt: student.createdAt.toISOString(),
      updatedAt: student.updatedAt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateStudentDto) {
    const instanceId = this.getInstanceId();
    await this.findOne(id);

    if (dto.email) {
      const existingEmail = await this.prisma.student.findUnique({
        where: { instanceId_email: { instanceId, email: dto.email } },
      });
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException(
          `A student with email "${dto.email}" already exists in this instance`,
        );
      }
    }

    if (dto.groupId) {
      const group = await this.prisma.group.findFirst({
        where: { id: dto.groupId, instanceId },
      });
      if (!group) throw new NotFoundException('Target group not found');
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.groupId !== undefined && { groupId: dto.groupId }),
      },
    });
  }

  async remove(id: string) {
    const instanceId = this.getInstanceId();
    const student = await this.prisma.student.findFirst({
      where: { id, instanceId },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.prisma.student.delete({ where: { id } });
  }

  async bulkImport(dto: BulkImportDto): Promise<BulkImportResultDto> {
    const instanceId = this.getInstanceId();

    const group = await this.prisma.group.findFirst({
      where: { id: dto.groupId, instanceId },
    });
    if (!group) throw new NotFoundException('Group not found');

    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      include: { _count: { select: { students: true } } },
    });
    if (!instance) throw new NotFoundException('Instance not found');

    const tier = instance.tier;
    const limit = TIER_LIMITS[tier]?.students ?? Infinity;

    let imported = 0;
    let inactive = 0;
    let skipped = 0;
    const skippedEmails: string[] = [];

    for (const row of dto.students) {
      if (!row.name) {
        skipped++;
        continue;
      }

      if (row.email) {
        const existing = await this.prisma.student.findUnique({
          where: { instanceId_email: { instanceId, email: row.email } },
        });
        if (existing) {
          skipped++;
          skippedEmails.push(row.email);
          continue;
        }
      }

      const currentCount = await this.prisma.student.count({
        where: { instanceId },
      });
      const isOverLimit = currentCount >= limit;

      const student = await this.prisma.student.create({
        data: {
          name: row.name,
          email: row.email,
          phone: row.phone,
          status: isOverLimit ? 'INACTIVE' : 'ACTIVE',
          groupId: dto.groupId,
          instanceId,
        },
      });

      await this.autoEnrollFreeCourses(student.id, dto.groupId, instanceId);

      if (isOverLimit) {
        inactive++;
      } else {
        imported++;
      }
    }

    return { imported, inactive, skipped, skippedEmails };
  }

  async exportCsv(groupId?: string): Promise<string> {
    const instanceId = this.getInstanceId();

    const where: Record<string, unknown> = { instanceId };
    if (groupId) {
      const group = await this.prisma.group.findFirst({
        where: { id: groupId, instanceId },
      });
      if (!group) throw new NotFoundException('Group not found');
      where.groupId = groupId;
    }

    const students = await this.prisma.student.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const header = 'name,email,phone,status,groupId,createdAt';
    const rows = students.map(
      (s) =>
        `"${s.name}","${s.email ?? ''}","${s.phone ?? ''}",${s.status},${s.groupId},${s.createdAt.toISOString()}`,
    );

    return [header, ...rows].join('\n');
  }

  async redeemInvitation(dto: RedeemInvitationDto) {
    const group = await this.prisma.group.findUnique({
      where: { invitationCode: dto.invitationCode },
    });
    if (!group) {
      throw new NotFoundException('Invalid or expired invitation code');
    }

    if (group.registrationMode !== 'CLOSED') {
      throw new BadRequestException(
        'This group does not require an invitation code. Use open registration instead.',
      );
    }

    const instanceId = group.instanceId;
    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      include: { _count: { select: { students: true } } },
    });
    if (!instance) throw new NotFoundException('Instance not found');

    const tier = instance.tier;
    const limit = TIER_LIMITS[tier]?.students ?? Infinity;
    const isOverLimit = instance._count.students >= limit;

    if (dto.email) {
      const existingEmail = await this.prisma.student.findUnique({
        where: { instanceId_email: { instanceId, email: dto.email } },
      });
      if (existingEmail) {
        throw new ConflictException(
          `A student with email "${dto.email}" already exists in this instance`,
        );
      }
    }

    const student = await this.prisma.student.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        status: isOverLimit ? 'INACTIVE' : 'ACTIVE',
        groupId: group.id,
        instanceId,
      },
    });

    await this.autoEnrollFreeCourses(student.id, group.id, instanceId);

    return {
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      status: student.status,
      groupId: student.groupId,
      createdAt: student.createdAt.toISOString(),
    };
  }
}
