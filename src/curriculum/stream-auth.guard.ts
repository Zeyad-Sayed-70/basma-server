import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

const SUSPICIOUS_UA_PATTERNS = [
  /curl/i,
  /wget/i,
  /python-requests/i,
  /postman/i,
  /insomnia/i,
  /httpie/i,
  /java/i,
  /go-http/i,
  /axios/i,
  /node-fetch/i,
  /phantomjs/i,
  /headless/i,
  /puppeteer/i,
  /playwright/i,
  /selenium/i,
  /nightmare/i,
  /mechanize/i,
  /scrapy/i,
  /ruby/i,
  /perl/i,
  /libwww/i,
  /httpclient/i,
  /okhttp/i,
];

@Injectable()
export class StreamAuthGuard implements CanActivate {
  private readonly logger = new Logger(StreamAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: {
        authorization?: string;
        'user-agent'?: string;
        origin?: string;
        referer?: string;
      };
      query: { st?: string };
      method: string;
      user?: any;
      signedStreamPayload?: {
        elementId: string;
        quality: string;
        track: string;
        container?: string;
      };
    }>();

    this.validateUserAgent(request.headers['user-agent']);
    this.validateOrigin(request);

    const authHeader = request.headers.authorization;
    const signedToken = request.query.st;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      try {
        const payload = this.jwtService.verify(token);

        request.user = {
          id: payload.sub,
          email: payload.email,
          name: payload.name ?? '',
          instanceId: payload.instanceId,
          role: payload.role,
        };

        return true;
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    if (signedToken) {
      try {
        const payload = this.jwtService.verify(signedToken);

        request.user = {
          id: payload.sub ?? 'anonymous',
          email: payload.email ?? '',
          name: payload.name ?? '',
          instanceId: payload.instanceId,
          role: payload.role ?? 'student',
        };

        request.signedStreamPayload = {
          elementId: payload.elementId,
          quality: payload.quality,
          track: payload.track,
          container: payload.container,
        };

        return true;
      } catch {
        throw new UnauthorizedException('Invalid or expired stream token');
      }
    }

    throw new UnauthorizedException('Authentication required');
  }

  private validateUserAgent(ua: string | undefined): void {
    if (!ua || ua.trim().length === 0) {
      throw new ForbiddenException('User-Agent header is required');
    }

    for (const pattern of SUSPICIOUS_UA_PATTERNS) {
      if (pattern.test(ua)) {
        this.logger.warn(`blocked.suspicious.ua ua="${ua}"`);
        throw new ForbiddenException('Access denied');
      }
    }
  }

  private validateOrigin(request: {
    headers: { origin?: string; referer?: string };
    method: string;
  }): void {
    if (request.method !== 'POST' && request.method !== 'GET') {
      return;
    }

    const allowedOrigins = this.getAllowedOrigins();
    const origin = request.headers.origin;
    const referer = request.headers.referer;

    if (origin && !allowedOrigins.some((o) => origin.startsWith(o))) {
      this.logger.warn(`blocked.origin origin="${origin}"`);
      throw new ForbiddenException('Access denied');
    }

    if (!origin && referer && !allowedOrigins.some((o) => referer.startsWith(o))) {
      this.logger.warn(`blocked.referer referer="${referer}"`);
      throw new ForbiddenException('Access denied');
    }
  }

  private getAllowedOrigins(): string[] {
    const apiUrl = this.configService.get<string>('API_BASE_URL', 'http://localhost:3000');
    return [
      apiUrl.replace('/api', ''),
      'http://localhost:3000',
      'http://localhost:3001',
      ...(this.configService.get<string>('CORS_ORIGINS', '')
        .split(',')
        .filter(Boolean)
        .map((o) => o.trim())),
    ];
  }
}
