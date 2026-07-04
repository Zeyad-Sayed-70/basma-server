import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { TierFeatureService } from '../services/tier-feature.service';
import { TenantContext } from '../context/tenant-context';
const EXCLUDED_PATHS = [
  '/api/auth',
  '/api/payments/webhook',
  '/api/health',
  '/api/admin',
  '/admin',
  '/api/docs',
  '/api/brand/public',
  '/api/landing/public',
  '/api/ws-test',
  '/api/domain-check',
];

const EXCLUDED_PREFIXES = ['/api/auth/', '/api/admin/', '/admin/'];

@Injectable()
export class TierExpiryGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tierFeatureService: TierFeatureService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      path?: string;
      url?: string;
      method?: string;
      user?: { role?: string };
    }>();
    const path: string = request.path ?? request.url ?? '';
    const method: string = request.method ?? 'GET';

    if (method === 'OPTIONS') return true;

    const isExcluded = EXCLUDED_PATHS.some(
      (p) => path === p || path.startsWith(p),
    );
    if (isExcluded) return true;

    const isExcludedPrefix = EXCLUDED_PREFIXES.some((p) => path.startsWith(p));
    if (isExcludedPrefix) return true;

    const instanceId = TenantContext.getInstanceId();
    if (!instanceId) return true;

    const instance = await this.prisma.instance.findUnique({
      where: { id: instanceId },
      select: { tier: true, tierExpiresAt: true },
    });

    if (!instance) return true;

    if (instance.tier === 'MUBTADI') return true;
    if (!instance.tierExpiresAt) return true;

    const now = new Date();
    const graceEnd = new Date(instance.tierExpiresAt.getTime());
    graceEnd.setDate(graceEnd.getDate() + 7);

    if (now <= graceEnd) return true;

    const role: string | undefined = request.user?.role ?? 'teacher';

    const isStudentPath = path.includes('/student/') || role === 'student';
    if (isStudentPath) return true;

    throw new HttpException(
      {
        statusCode: HttpStatus.PAYMENT_REQUIRED,
        code: 'PLAN_EXPIRED',
        message:
          'Your plan has expired. Please renew your subscription to regain access.',
      },
      HttpStatus.PAYMENT_REQUIRED,
    );
  }
}
