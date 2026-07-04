import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext, TenantData } from './tenant-context';

interface JwtPayload {
  instanceId?: string;
  sub?: string;
  role?: string;
}

const CACHE_TTL_MS = 60_000;

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);
  private readonly appBaseDomain: string;
  private readonly domainCache = new Map<
    string,
    { instanceId: string | null; expiresAt: number }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.appBaseDomain = this.configService.get<string>(
      'APP_BASE_DOMAIN',
      'basma.app',
    );
  }

  async use(req: Request, _res: Response, next: NextFunction) {
    const data: TenantData = { instanceId: '' };

    const queryToken = req.query.token;
    const rawToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : typeof queryToken === 'string'
        ? queryToken
        : null;

    if (rawToken) {
      try {
        const payloadBase64 = rawToken.split('.')[1];
        if (payloadBase64) {
          const payload = JSON.parse(
            Buffer.from(payloadBase64, 'base64url').toString('utf-8'),
          ) as JwtPayload;
          if (payload.instanceId) {
            data.instanceId = payload.instanceId;
            data.teacherId = payload.sub;
            data.role = payload.role;
          }
        }
      } catch {
        this.logger.warn('Failed to decode JWT for tenant context');
      }
    }

    if (!data.instanceId) {
      const subdomain = this.resolveSubdomain(req);
      if (subdomain) {
        data.subdomain = subdomain;
      } else {
        const customDomainInstanceId = await this.resolveCustomDomain(req);
        if (customDomainInstanceId) {
          data.customDomain = req.hostname.toLowerCase();
          data.instanceId = customDomainInstanceId;
        }
      }
    }

    TenantContext.run(data, next);
  }

  private resolveSubdomain(req: Request): string | undefined {
    const headerSubdomain = req.headers['x-subdomain'] as string | undefined;
    if (headerSubdomain) return headerSubdomain;

    const host = req.hostname;
    if (
      host &&
      host !== 'localhost' &&
      !host.startsWith('192.') &&
      !host.startsWith('10.')
    ) {
      const hostLower = host.toLowerCase();
      const parts = hostLower.split('.');
      if (parts.length >= 3) {
        if (
          hostLower === this.appBaseDomain ||
          hostLower.endsWith('.' + this.appBaseDomain)
        ) {
          return parts[0];
        }
        return parts[0];
      }
    }

    return undefined;
  }

  private async resolveCustomDomain(req: Request): Promise<string | null> {
    const host = req.hostname?.toLowerCase();
    if (
      !host ||
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.startsWith('192.') ||
      host.startsWith('10.') ||
      host === this.appBaseDomain ||
      host.endsWith('.' + this.appBaseDomain)
    ) {
      return null;
    }

    const cached = this.domainCache.get(host);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.instanceId;
    }

    const result = await this.prisma.brand.findFirst({
      where: {
        customDomain: host,
        customDomainVerifiedAt: { not: null },
      },
      select: { instanceId: true },
    });

    const instanceId = result?.instanceId ?? null;
    this.domainCache.set(host, {
      instanceId,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
    return instanceId;
  }
}
