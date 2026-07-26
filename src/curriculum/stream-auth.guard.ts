import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class StreamAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string; 'user-agent'?: string };
      query: { st?: string };
      user?: any;
      signedStreamPayload?: {
        elementId: string;
        quality: string;
        track: string;
        container?: string;
      };
    }>();

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
}
