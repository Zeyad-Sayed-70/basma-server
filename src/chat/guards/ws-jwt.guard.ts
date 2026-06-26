import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
  email: string;
  instanceId: string;
  role: string;
}

interface UserData {
  id: string;
  email: string;
  instanceId: string;
  role: string;
}

@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient<Socket>();

    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const authToken = typeof auth?.token === 'string' ? auth.token : undefined;
    const headers = client.handshake.headers as
      | Record<string, unknown>
      | undefined;
    const headerAuth =
      typeof headers?.authorization === 'string'
        ? headers.authorization
        : undefined;
    const token =
      authToken ?? (headerAuth ? headerAuth.replace('Bearer ', '') : undefined);

    if (!token) {
      this.logger.warn('No token provided on WebSocket connection');
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token);

      const user: UserData = {
        id: payload.sub,
        email: payload.email,
        instanceId: payload.instanceId,
        role: payload.role,
      };

      (client as unknown as { data: { user: UserData } }).data.user = user;

      return true;
    } catch (error) {
      this.logger.warn(`Invalid WebSocket token: ${(error as Error).message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
