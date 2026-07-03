import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';
import { TierFeatureService } from '../common/services/tier-feature.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import * as crypto from 'crypto';

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tierFeatureService: TierFeatureService,
  ) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  async create(dto: CreateGroupDto) {
    const instanceId = this.getInstanceId();
    const groupsCount = await this.prisma.group.count({
      where: { instanceId },
    });
    await this.tierFeatureService.checkResource(
      instanceId,
      'groups',
      groupsCount,
    );

    const existing = await this.prisma.group.findUnique({
      where: { instanceId_name: { instanceId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException(`A group named "${dto.name}" already exists`);
    }

    return this.prisma.group.create({
      data: {
        name: dto.name,
        description: dto.description,
        registrationMode: dto.registrationMode ?? 'OPEN',
        instanceId,
      },
    });
  }

  async findAll() {
    const instanceId = this.getInstanceId();

    const groups = await this.prisma.group.findMany({
      where: { instanceId },
      include: {
        _count: { select: { students: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const limits = await this.tierFeatureService.getLimits(instanceId);

    const data = groups.map((g) => ({
      id: g.id,
      name: g.name,
      description: g.description,
      registrationMode: g.registrationMode,
      invitationCode: g.invitationCode,
      instanceId: g.instanceId,
      studentCount: {
        active: 0,
        inactive: 0,
      },
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    }));

    const studentCounts = await Promise.all(
      groups.map((g) =>
        this.prisma.student.groupBy({
          by: ['status'],
          where: { groupId: g.id },
          _count: true,
        }),
      ),
    );

    studentCounts.forEach((counts, i) => {
      data[i].studentCount.active =
        counts.find((c) => c.status === 'ACTIVE')?._count ?? 0;
      data[i].studentCount.inactive =
        counts.find((c) => c.status === 'INACTIVE')?._count ?? 0;
    });

    return { data, total: groups.length, limits };
  }

  async findOne(id: string) {
    const instanceId = this.getInstanceId();
    const group = await this.prisma.group.findFirst({
      where: { id, instanceId },
      include: {
        _count: { select: { students: true } },
      },
    });
    if (!group) throw new NotFoundException('Group not found');

    const counts = await this.prisma.student.groupBy({
      by: ['status'],
      where: { groupId: id },
      _count: true,
    });

    return {
      id: group.id,
      name: group.name,
      description: group.description,
      registrationMode: group.registrationMode,
      invitationCode: group.invitationCode,
      instanceId: group.instanceId,
      studentCount: {
        active: counts.find((c) => c.status === 'ACTIVE')?._count ?? 0,
        inactive: counts.find((c) => c.status === 'INACTIVE')?._count ?? 0,
      },
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateGroupDto) {
    const instanceId = this.getInstanceId();
    await this.findOne(id);

    if (dto.name) {
      const existing = await this.prisma.group.findUnique({
        where: { instanceId_name: { instanceId, name: dto.name } },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `A group named "${dto.name}" already exists`,
        );
      }
    }

    return this.prisma.group.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.registrationMode !== undefined && {
          registrationMode: dto.registrationMode,
        }),
      },
    });
  }

  async remove(id: string) {
    const instanceId = this.getInstanceId();
    const group = await this.prisma.group.findFirst({
      where: { id, instanceId },
    });
    if (!group) throw new NotFoundException('Group not found');

    await this.prisma.group.delete({ where: { id } });
  }

  async generateInvitationCode(id: string) {
    const instanceId = this.getInstanceId();
    const group = await this.prisma.group.findFirst({
      where: { id, instanceId },
    });
    if (!group) throw new NotFoundException('Group not found');

    const invitationCode = crypto.randomBytes(6).toString('hex');

    return this.prisma.group.update({
      where: { id },
      data: { invitationCode },
      select: {
        id: true,
        name: true,
        invitationCode: true,
        registrationMode: true,
      },
    });
  }

  async revokeInvitationCode(id: string) {
    const instanceId = this.getInstanceId();
    const group = await this.prisma.group.findFirst({
      where: { id, instanceId },
    });
    if (!group) throw new NotFoundException('Group not found');

    return this.prisma.group.update({
      where: { id },
      data: { invitationCode: null },
      select: {
        id: true,
        name: true,
        invitationCode: true,
        registrationMode: true,
      },
    });
  }
}
