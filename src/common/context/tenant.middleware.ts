import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContext, TenantData } from './tenant-context';

interface JwtPayload {
  instanceId?: string;
  sub?: string;
  role?: string;
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

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

    TenantContext.run(data, next);
  }
}
