import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CoursesService } from '../courses/courses.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContext } from '../common/context/tenant-context';
import { TierFeatureService } from '../common/services/tier-feature.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
    private readonly tierFeatureService: TierFeatureService,
    private readonly eventEmitter: EventEmitter2,
    private readonly jwtService: JwtService,
  ) {}

  private getInstanceId(): string {
    const id = TenantContext.getInstanceId();
    if (!id) throw new ForbiddenException('Tenant context not found');
    return id;
  }

  async create(dto: CreateSessionDto) {
    const instanceId = this.getInstanceId();

    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, instanceId },
    });
    if (!course) throw new NotFoundException('Course not found');

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const sessionsThisMonth = await this.prisma.session.count({
      where: { instanceId, createdAt: { gte: startOfMonth } },
    });
    await this.tierFeatureService.checkResource(
      instanceId,
      'sessionsPerMonth',
      sessionsThisMonth,
    );

    const session = await this.prisma.session.create({
      data: {
        title: dto.title,
        startTime: new Date(dto.startTime),
        endTime: dto.endTime ? new Date(dto.endTime) : null,
        type: dto.type ?? 'LOCAL',
        location: dto.location,
        platform: dto.platform,
        meetingUrl: dto.meetingUrl,
        notes: dto.notes,
        courseId: dto.courseId,
        instanceId,
      },
    });

    this.eventEmitter.emit('session.created', {
      sessionId: session.id,
      title: session.title,
      startTime: session.startTime,
      courseId: session.courseId,
      instanceId: session.instanceId,
    });

    return session;
  }

  async findAll(
    courseId?: string,
    from?: string,
    to?: string,
    user?: { id: string; role: string },
  ) {
    const instanceId = this.getInstanceId();

    const where: Record<string, unknown> = { instanceId };
    if (courseId) {
      if (user?.role === 'student') {
        await this.coursesService.assertStudentEnrolled(courseId, user.id);
      }
      const course = await this.prisma.course.findFirst({
        where: { id: courseId, instanceId },
      });
      if (!course) throw new NotFoundException('Course not found');
      where.courseId = courseId;
    } else if (user?.role === 'student') {
      const enrollments = await this.prisma.courseEnrollment.findMany({
        where: { studentId: user.id, instanceId },
        select: { courseId: true },
      });
      where.courseId = { in: enrollments.map((e) => e.courseId) };
    }
    if (from || to) {
      const startTime: Record<string, Date> = {};
      if (from) startTime.gte = new Date(from);
      if (to) startTime.lte = new Date(to);
      where.startTime = startTime;
    }

    const sessions = await this.prisma.session.findMany({
      where,
      orderBy: { startTime: 'asc' },
    });

    const data = sessions.map((s) => ({
      id: s.id,
      title: s.title,
      startTime: s.startTime.toISOString(),
      endTime: s.endTime?.toISOString() ?? null,
      type: s.type,
      location: s.location,
      platform: s.platform,
      meetingUrl: s.meetingUrl,
      notes: s.notes,
      courseId: s.courseId,
      instanceId: s.instanceId,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    return { data, total: sessions.length };
  }

  async findOne(id: string, user?: { id: string; role: string }) {
    const instanceId = this.getInstanceId();
    const session = await this.prisma.session.findFirst({
      where: { id, instanceId },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (user?.role === 'student') {
      await this.coursesService.assertStudentEnrolled(
        session.courseId,
        user.id,
      );
    }

    return {
      id: session.id,
      title: session.title,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString() ?? null,
      type: session.type,
      location: session.location,
      platform: session.platform,
      meetingUrl: session.meetingUrl,
      notes: session.notes,
      courseId: session.courseId,
      instanceId: session.instanceId,
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
    };
  }

  async update(id: string, dto: UpdateSessionDto) {
    await this.findOne(id);

    return this.prisma.session.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.startTime !== undefined && {
          startTime: new Date(dto.startTime),
        }),
        ...(dto.endTime !== undefined && {
          endTime: dto.endTime ? new Date(dto.endTime) : null,
        }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.platform !== undefined && { platform: dto.platform }),
        ...(dto.meetingUrl !== undefined && { meetingUrl: dto.meetingUrl }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async getJoinLink(id: string, user: { id: string; role: string; name: string }) {
    const instanceId = this.getInstanceId();
    const session = await this.prisma.session.findFirst({
      where: { id, instanceId },
    });
    if (!session) throw new NotFoundException('Session not found');

    if (user.role === 'student') {
      await this.coursesService.assertStudentEnrolled(session.courseId, user.id);
    }

    if (!session.meetingUrl) {
      throw new NotFoundException('No meeting URL configured for this session');
    }

    const joinToken = this.jwtService.sign(
      {
        sub: user.id,
        sessionId: id,
        name: user.name,
        role: user.role,
        instanceId,
        type: 'session-join',
      },
      { expiresIn: '5m' },
    );

    const separator = session.meetingUrl.includes('?') ? '&' : '?';
    const signedUrl = `${session.meetingUrl}${separator}participantToken=${joinToken}`;

    this.logger.log(`session.join sessionId=${id} userId=${user.id}`);

    return {
      meetingUrl: signedUrl,
      title: session.title,
      startTime: session.startTime.toISOString(),
      endTime: session.endTime?.toISOString() ?? null,
      expiresInSeconds: 300,
    };
  }

  async remove(id: string) {
    const instanceId = this.getInstanceId();
    const session = await this.prisma.session.findFirst({
      where: { id, instanceId },
    });
    if (!session) throw new NotFoundException('Session not found');

    await this.prisma.session.delete({ where: { id } });
  }
}
