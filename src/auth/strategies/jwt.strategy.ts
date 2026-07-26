import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  instanceId: string;
  role: string;
  jti?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.role === 'student') {
      const student = await this.prisma.student.findUnique({
        where: { id: payload.sub },
      });
      if (!student) {
        throw new UnauthorizedException('Student not found');
      }
      return {
        id: student.id,
        email: student.email ?? '',
        name: student.name,
        lang: '',
        instanceId: student.instanceId,
        role: payload.role,
        jti: payload.jti,
      };
    }

    const teacher = await this.prisma.teacher.findUnique({
      where: { id: payload.sub },
    });
    if (!teacher) {
      throw new UnauthorizedException('Teacher not found');
    }
    return {
      id: teacher.id,
      email: teacher.email,
      name: teacher.name,
      lang: teacher.lang,
      instanceId: teacher.instanceId,
      role: payload.role,
      jti: payload.jti,
    };
  }
}
