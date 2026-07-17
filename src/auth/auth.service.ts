import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { UpdateTeacherProfileDto } from './dto/update-profile.dto';
import { LoginDto } from './dto/login.dto';
import { StudentLoginDto } from './dto/student-login.dto';
import { TenantContext } from '../common/context/tenant-context';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  private readonly jwtExpiration: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    configService: ConfigService,
  ) {
    this.jwtExpiration = configService.get<string>('JWT_EXPIRATION') ?? '7d';
  }

  private computeActions(teacher: { phone: string | null }): string[] {
    const actions: string[] = [];
    if (!teacher.phone) {
      actions.push('PHONE_NUMBER_REQUIRED');
    }
    return actions;
  }

  private teacherToResponse(teacher: any) {
    const responses = {
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      phone: teacher.phone ?? undefined,
      lang: teacher.lang,
      instanceId: teacher.instanceId,
    };
    return responses;
  }

  async signup(dto: SignupDto) {
    const existing = await this.prisma.teacher.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const subdomain =
      dto.subdomain ??
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    const subdomainTaken = await this.prisma.instance.findUnique({
      where: { subdomain },
    });
    if (subdomainTaken) {
      throw new ConflictException(`Subdomain "${subdomain}" is already taken`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const instance = await this.prisma.instance.create({
      data: {
        name: dto.name,
        subdomain,
        brand: { create: {} },
        teacher: {
          create: {
            email: dto.email,
            passwordHash,
            name: dto.name,
            phone: dto.phone,
            lang: dto.lang ?? 'ar',
          },
        },
      },
      include: { teacher: true },
    });

    const teacher = instance.teacher!;
    const tokens = this.generateTokens(teacher.id, teacher.email, instance.id);

    return {
      ...tokens,
      teacher: {
        ...this.teacherToResponse(teacher),
        actions: this.computeActions(teacher),
      },
    };
  }

  async login(dto: LoginDto) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { email: dto.email },
    });
    if (!teacher) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      teacher.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = this.generateTokens(
      teacher.id,
      teacher.email,
      teacher.instanceId,
    );

    return {
      ...tokens,
      teacher: {
        ...this.teacherToResponse(teacher),
        actions: this.computeActions(teacher),
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        email: string;
        instanceId: string;
        type: string;
        role?: string;
      }>(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (payload.role === 'student') {
        const student = await this.prisma.student.findUnique({
          where: { id: payload.sub },
        });
        if (!student) {
          throw new UnauthorizedException('Student not found');
        }

        const tokens = this.generateStudentTokens(
          student.id,
          student.name,
          student.instanceId,
        );
        return {
          ...tokens,
          student: {
            id: student.id,
            name: student.name,
            email: student.email,
            phone: student.phone,
            groupId: student.groupId,
            instanceId: student.instanceId,
          },
        };
      }

      const teacher = await this.prisma.teacher.findUnique({
        where: { id: payload.sub },
      });
      if (!teacher) {
        throw new UnauthorizedException('Teacher not found');
      }

      const tokens = this.generateTokens(
        teacher.id,
        teacher.email,
        teacher.instanceId,
      );

      return {
        ...tokens,
        teacher: {
          ...this.teacherToResponse(teacher),
          actions: this.computeActions(teacher),
        },
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getProfile(teacherId: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
      include: { instance: true },
    });
    if (!teacher) {
      throw new UnauthorizedException('Teacher not found');
    }
    return {
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      phone: teacher.phone ?? undefined,
      lang: teacher.lang,
      tier: teacher.instance.tier,
      instanceId: teacher.instanceId,
      subdomain: teacher.instance.subdomain,
      createdAt: teacher.createdAt.toISOString(),
      actions: this.computeActions(teacher),
    };
  }

  async updateProfile(teacherId: string, dto: UpdateTeacherProfileDto) {
    const teacher = await this.prisma.teacher.update({
      where: { id: teacherId },
      data: { phone: dto.phone },
    });
    return {
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      phone: teacher.phone ?? undefined,
      lang: teacher.lang,
      instanceId: teacher.instanceId,
      actions: this.computeActions(teacher),
    };
  }

  async studentSignup(dto: {
    name: string;
    email?: string;
    phone?: string;
    password?: string;
    code: string;
  }) {
    let instanceId = TenantContext.getInstanceId();
    if (!instanceId) {
      const subdomain = TenantContext.get()?.subdomain;
      if (subdomain) {
        const instance = await this.prisma.instance.findUnique({
          where: { subdomain },
        });
        if (instance) {
          instanceId = instance.id;
        }
      }
    }
    let groupId: string;
    let instanceIdForGroup: string;

    const groupById = await this.prisma.group.findUnique({
      where: { id: dto.code },
    });
    if (groupById) {
      if (groupById.registrationMode !== 'OPEN') {
        throw new BadRequestException('Group is not open for registration');
      }
      groupId = groupById.id;
      instanceIdForGroup = groupById.instanceId;
    } else {
      const groupByCode = await this.prisma.group.findUnique({
        where: { invitationCode: dto.code },
      });
      if (!groupByCode) {
        throw new NotFoundException('Invalid invitation code or group ID');
      }
      groupId = groupByCode.id;
      instanceIdForGroup = groupByCode.instanceId;
    }

    if (instanceId && instanceId !== instanceIdForGroup) {
      throw new ForbiddenException('Cross-instance access denied');
    }

    if (dto.email) {
      const existing = await this.prisma.student.findUnique({
        where: {
          instanceId_email: {
            instanceId: instanceIdForGroup,
            email: dto.email,
          },
        },
      });
      if (existing) {
        if (dto.password) {
          const passwordHash = await bcrypt.hash(dto.password, 10);
          await this.prisma.student.update({
            where: { id: existing.id },
            data: { passwordHash },
          });
        }
        const tokens = this.generateStudentTokens(
          existing.id,
          existing.name,
          instanceIdForGroup,
        );
        return {
          ...tokens,
          student: {
            id: existing.id,
            name: existing.name,
            email: existing.email,
            phone: existing.phone,
            groupId: existing.groupId,
            instanceId: existing.instanceId,
          },
        };
      }
    }

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : undefined;

    const student = await this.prisma.student.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        groupId,
        instanceId: instanceIdForGroup,
      },
    });

    const tokens = this.generateStudentTokens(
      student.id,
      student.name,
      instanceIdForGroup,
    );
    return {
      ...tokens,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        groupId: student.groupId,
        instanceId: student.instanceId,
      },
    };
  }

  async studentLogin(dto: StudentLoginDto) {
    let instanceId = TenantContext.getInstanceId();
    if (!instanceId) {
      const subdomain = TenantContext.get()?.subdomain;
      if (subdomain) {
        const instance = await this.prisma.instance.findUnique({
          where: { subdomain },
        });
        if (instance) {
          instanceId = instance.id;
        }
      }
    }

    const where: any = { email: dto.email };
    if (instanceId) {
      where.instanceId = instanceId;
    }
    const student = await this.prisma.student.findFirst({ where });
    if (!student) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!student.passwordHash) {
      throw new UnauthorizedException(
        'No password set for this account. Sign up with a password first.',
      );
    }

    const passwordValid = await bcrypt.compare(
      dto.password,
      student.passwordHash,
    );
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = this.generateStudentTokens(
      student.id,
      student.name,
      student.instanceId,
    );
    return {
      ...tokens,
      student: {
        id: student.id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        groupId: student.groupId,
        instanceId: student.instanceId,
      },
    };
  }

  async getStudentProfile(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { group: true },
    });
    if (!student) {
      throw new UnauthorizedException('Student not found');
    }
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      phone: student.phone,
      status: student.status,
      groupId: student.groupId,
      instanceId: student.instanceId,
      groupName: student.group.name,
      createdAt: student.createdAt.toISOString(),
    };
  }

  private generateTokens(teacherId: string, email: string, instanceId: string) {
    const accessPayload = {
      sub: teacherId,
      email,
      instanceId,
      role: 'teacher',
    };
    const refreshPayload = {
      sub: teacherId,
      email,
      instanceId,
      type: 'refresh',
    };

    return {
      accessToken: this.jwtService.sign(accessPayload, {
        expiresIn: this.jwtExpiration as unknown as never,
      }),
      refreshToken: this.jwtService.sign(refreshPayload, {
        expiresIn: '30d' as unknown as never,
      }),
    };
  }

  private generateStudentTokens(
    studentId: string,
    name: string,
    instanceId: string,
  ) {
    const accessPayload = {
      sub: studentId,
      email: name,
      instanceId,
      role: 'student',
    };
    const refreshPayload = {
      sub: studentId,
      email: name,
      instanceId,
      type: 'refresh',
    };

    return {
      accessToken: this.jwtService.sign(accessPayload, {
        expiresIn: this.jwtExpiration as unknown as never,
      }),
      refreshToken: this.jwtService.sign(refreshPayload, {
        expiresIn: '30d' as unknown as never,
      }),
    };
  }
}
