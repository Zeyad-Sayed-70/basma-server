import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { TierFeatureService } from '../common/services/tier-feature.service';
import {
  TIER_DISPLAY_NAMES,
  TIER_ORDER,
} from '../common/constants/tier-limits';
import { Tier } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly tierFeatureService: TierFeatureService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.jwtService.sign(
      {
        sub: admin.id,
        email: admin.email,
        role: 'admin',
      },
      { expiresIn: '8h' },
    );

    return {
      accessToken: token,
      admin: { id: admin.id, email: admin.email, name: admin.name },
    };
  }

  async getProfile(adminId: string) {
    const admin = await this.prisma.admin.findUnique({
      where: { id: adminId },
    });
    if (!admin) throw new NotFoundException('Admin not found');
    return { id: admin.id, email: admin.email, name: admin.name };
  }

  async listInstances(search?: string, page = 1, limit = 50) {
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subdomain: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [instances, total] = await Promise.all([
      this.prisma.instance.findMany({
        where,
        include: {
          teacher: {
            select: { id: true, email: true, name: true, lang: true },
          },
          _count: {
            select: {
              groups: true,
              students: true,
              courses: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.instance.count({ where }),
    ]);

    const data = instances.map((inst) => ({
      id: inst.id,
      name: inst.name,
      subdomain: inst.subdomain,
      tier: inst.tier,
      tierDisplay: TIER_DISPLAY_NAMES[inst.tier],
      tierExpiresAt: inst.tierExpiresAt?.toISOString() ?? null,
      tierRenewedAt: inst.tierRenewedAt?.toISOString() ?? null,
      teacher: inst.teacher,
      counts: inst._count,
      createdAt: inst.createdAt.toISOString(),
    }));

    return { data, total, page, limit };
  }

  async getInstanceDetail(instanceId: string) {
    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      include: {
        teacher: { select: { id: true, email: true, name: true, lang: true } },
        _count: {
          select: {
            groups: true,
            students: true,
            courses: true,
            sessions: true,
            quizzes: true,
            assignments: true,
            payments: true,
            notifications: true,
          },
        },
      },
    });
    if (!instance) throw new NotFoundException('Instance not found');

    const expiry = await this.tierFeatureService.checkExpiry(instanceId);

    return {
      id: instance.id,
      name: instance.name,
      subdomain: instance.subdomain,
      tier: instance.tier,
      tierDisplay: TIER_DISPLAY_NAMES[instance.tier],
      tierExpiresAt: instance.tierExpiresAt?.toISOString() ?? null,
      tierRenewedAt: instance.tierRenewedAt?.toISOString() ?? null,
      teacher: instance.teacher,
      counts: instance._count,
      limits: this.tierFeatureService.getLimitsForTier(instance.tier),
      features: this.tierFeatureService.getFeaturesForTier(instance.tier),
      expiry,
      settings: instance.settings,
      createdAt: instance.createdAt.toISOString(),
      updatedAt: instance.updatedAt.toISOString(),
    };
  }

  async getInstanceUsage(instanceId: string) {
    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      select: { id: true, tier: true },
    });
    if (!instance) throw new NotFoundException('Instance not found');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      groupsCount,
      studentsCount,
      coursesCount,
      sessionsThisMonth,
      quizzesCount,
      assignmentsCount,
      notificationsThisMonth,
      fileStorageResult,
    ] = await Promise.all([
      this.prisma.group.count({ where: { instanceId } }),
      this.prisma.student.count({ where: { instanceId } }),
      this.prisma.course.count({ where: { instanceId } }),
      this.prisma.session.count({
        where: { instanceId, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.quiz.count({ where: { instanceId } }),
      this.prisma.assignment.count({ where: { instanceId } }),
      this.prisma.notification.count({
        where: { instanceId, createdAt: { gte: startOfMonth } },
      }),
      this.getTotalFileStorage(instanceId),
    ]);

    const limits = this.tierFeatureService.getLimitsForTier(instance.tier);

    const usage = {
      groups: {
        current: groupsCount,
        limit: limits.groups,
        percent: this.percent(groupsCount, limits.groups),
      },
      students: {
        current: studentsCount,
        limit: limits.students,
        percent: this.percent(studentsCount, limits.students),
      },
      courses: {
        current: coursesCount,
        limit: limits.courses,
        percent: this.percent(coursesCount, limits.courses),
      },
      sessionsThisMonth: {
        current: sessionsThisMonth,
        limit: limits.sessionsPerMonth,
        percent: this.percent(sessionsThisMonth, limits.sessionsPerMonth),
      },
      quizzes: {
        current: quizzesCount,
        limit: limits.quizzes,
        percent: this.percent(quizzesCount, limits.quizzes),
      },
      assignments: {
        current: assignmentsCount,
        limit: limits.assignments,
        percent: this.percent(assignmentsCount, limits.assignments),
      },
      notificationsThisMonth: {
        current: notificationsThisMonth,
        limit: limits.whatsappNotifsPerMonth,
        percent: this.percent(
          notificationsThisMonth,
          limits.whatsappNotifsPerMonth,
        ),
      },
      fileStorage: {
        currentGB: Math.round(fileStorageResult / 1073741824),
        limitGB: Math.round(limits.fileStorageMB / 1024),
        percent: this.percent(
          fileStorageResult / 1073741824,
          Math.round(limits.fileStorageMB / 1024) || 1,
        ),
      },
    };

    return usage;
  }

  private percent(current: number, limit: number): number {
    if (limit === Infinity) return 0;
    if (limit === 0) return 100;
    return Math.round((current / limit) * 100);
  }

  private async getTotalFileStorage(instanceId: string): Promise<number> {
    try {
      const [agentSpace, videos, files, images, brands, chats, submissions] =
        await Promise.all([
          this.prisma.agentSpaceFile.aggregate({
            where: { instanceId },
            _sum: { fileSize: true },
          }),
          this.prisma.curriculumVideo.aggregate({
            where: { instanceId },
            _sum: { fileSize: true },
          }),
          this.prisma.curriculumFile.aggregate({
            where: { instanceId },
            _sum: { fileSize: true },
          }),
          this.prisma.curriculumImage.aggregate({
            where: { instanceId },
            _sum: { fileSize: true },
          }),
          this.prisma.brand.aggregate({
            where: { instanceId },
            _sum: { logoFileSize: true },
          }),
          this.prisma.chatMessage.aggregate({
            where: { instanceId },
            _sum: { fileSize: true },
          }),
          this.prisma.studentAssignmentSubmission.aggregate({
            where: { instanceId },
            _sum: { fileSize: true },
          }),
        ]);

      return (
        (agentSpace._sum.fileSize ?? 0) +
        (videos._sum.fileSize ?? 0) +
        (files._sum.fileSize ?? 0) +
        (images._sum.fileSize ?? 0) +
        (brands._sum.logoFileSize ?? 0) +
        (chats._sum.fileSize ?? 0) +
        (submissions._sum.fileSize ?? 0)
      );
    } catch {
      return 0;
    }
  }

  async changeTier(
    instanceId: string,
    newTier: Tier,
    periodMonths: number | null,
    amountPaid: number | null,
    changedBy: string,
  ) {
    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) throw new NotFoundException('Instance not found');

    const oldTier = instance.tier;
    if (oldTier === newTier) {
      throw new BadRequestException(
        `Instance is already on ${TIER_DISPLAY_NAMES[newTier].ar} plan`,
      );
    }

    const isUpgrade = TIER_ORDER.indexOf(newTier) > TIER_ORDER.indexOf(oldTier);

    const tierExpiresAt = periodMonths
      ? this.tierFeatureService.calculateExpiry(periodMonths)
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.instance.update({
        where: { id: instanceId },
        data: {
          tier: newTier,
          tierExpiresAt,
          tierRenewedAt: periodMonths ? new Date() : undefined,
        },
      });

      await tx.tierChangeLog.create({
        data: {
          instanceId,
          fromTier: oldTier,
          toTier: newTier,
          periodMonths,
          amountPaid,
          changedBy,
        },
      });

      if (isUpgrade && periodMonths) {
        await tx.student.updateMany({
          where: { instanceId, status: 'INACTIVE' },
          data: { status: 'ACTIVE' },
        });
      }
    });

    return this.getInstanceDetail(instanceId);
  }

  async getTierLogs(instanceId: string) {
    return this.prisma.tierChangeLog.findMany({
      where: { instanceId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getPlatformStats() {
    const [
      totalInstances,
      totalTeachers,
      totalStudents,
      totalGroups,
      tierBreakdown,
    ] = await Promise.all([
      this.prisma.instance.count(),
      this.prisma.teacher.count(),
      this.prisma.student.count(),
      this.prisma.group.count(),
      this.prisma.instance.groupBy({
        by: ['tier'],
        _count: true,
      }),
    ]);

    const tierStats = Object.fromEntries(
      tierBreakdown.map((t) => [t.tier, t._count]),
    );

    return {
      totalInstances,
      totalTeachers,
      totalStudents,
      totalGroups,
      tierBreakdown: tierStats,
    };
  }

  async renewPlan(
    instanceId: string,
    periodMonths: number,
    amountPaid: number | null,
    changedBy: string,
  ) {
    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
    });
    if (!instance) throw new NotFoundException('Instance not found');

    const tierExpiresAt = this.tierFeatureService.calculateExpiry(periodMonths);

    await this.prisma.$transaction(async (tx) => {
      await tx.instance.update({
        where: { id: instanceId },
        data: {
          tierExpiresAt,
          tierRenewedAt: new Date(),
        },
      });

      await tx.tierChangeLog.create({
        data: {
          instanceId,
          fromTier: instance.tier,
          toTier: instance.tier,
          periodMonths,
          amountPaid,
          changedBy,
        },
      });

      await tx.student.updateMany({
        where: { instanceId, status: 'INACTIVE' },
        data: { status: 'ACTIVE' },
      });
    });

    return this.getInstanceDetail(instanceId);
  }
}
