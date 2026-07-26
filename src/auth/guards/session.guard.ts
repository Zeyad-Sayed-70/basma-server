import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';

export const SKIP_SESSION_KEY = 'skipSession';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipSession = this.reflector.getAllAndOverride<boolean>(
      SKIP_SESSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipSession) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: { jti?: string }; path?: string }>();

    const user = request.user;
    if (!user?.jti) {
      return true;
    }

    const isValid = await this.authService.validateSession(user.jti);
    if (!isValid) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    return true;
  }
}
