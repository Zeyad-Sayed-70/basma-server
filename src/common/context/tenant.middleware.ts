import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContext, TenantData } from './tenant-context';

interface JwtPayload {
  instanceId?: string;
  sub?: string;
  role?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(private readonly prisma: PrismaService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    const data: TenantData = { instanceId: '' };

    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const payloadBase64 = token.split('.')[1];
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
      }
    }

    TenantContext.run(data, next);
  }

  private resolveSubdomain(req: Request): string | undefined {
    const headerSubdomain = req.headers['x-subdomain'] as string | undefined;
    if (headerSubdomain) return headerSubdomain;

    const host = req.hostname;
    if (host && host !== 'localhost' && !host.startsWith('192.') && !host.startsWith('10.')) {
      const parts = host.split('.');
      if (parts.length >= 3) {
        return parts[0];
      }
    }

    return undefined;
  }
}
