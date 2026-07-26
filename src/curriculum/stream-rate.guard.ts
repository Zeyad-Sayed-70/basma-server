import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

interface RateEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class StreamRateGuard implements CanActivate {
  private readonly logger = new Logger(StreamRateGuard.name);
  private readonly store = new Map<string, RateEntry>();
  private readonly maxRequests = 10;
  private readonly windowMs = 60_000;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user?: { id?: string; role?: string };
      ip?: string;
    }>();

    const userId = request.user?.id ?? request.ip ?? 'anonymous';
    const now = Date.now();

    let entry = this.store.get(userId);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.store.set(userId, entry);
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      this.logger.warn(`rate.limit userId=${userId} count=${entry.count}`);
      throw new HttpException(
        {
          status: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too many stream requests. Please slow down.',
          retryAfter: Math.ceil((entry.resetAt - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
