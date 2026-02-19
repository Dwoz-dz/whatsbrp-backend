import { CanActivate, Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { Socket } from 'socket.io';
import { UsersService } from '../users/users.service';
import { AuthUser } from './ws.types';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly users: UsersService) {}

  async canActivate(context: any): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();

    const token =
      (client.handshake.auth?.token as string | undefined) ??
      this.fromAuthHeader(client.handshake.headers?.authorization as any);

    if (!token) throw new UnauthorizedException('Missing WS token');

    const secret = process.env.JWT_SECRET ?? 'dev_secret';

    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch {
      throw new UnauthorizedException('Invalid WS token');
    }

    const userId = payload?.sub as string | undefined;
    if (!userId) throw new UnauthorizedException('Invalid WS payload');

    // نجيبو user safe من DB
    const user = await this.users.findSafeById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    if (user.status !== 'APPROVED') {
      throw new UnauthorizedException('Account not approved');
    }

    // inject into socket
    client.data.user = user as AuthUser;

    return true;
  }

  private fromAuthHeader(v?: string) {
    if (!v) return undefined;
    const m = v.match(/^Bearer\s+(.+)$/i);
    return m?.[1];
  }
}
