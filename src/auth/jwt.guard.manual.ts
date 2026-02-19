import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

type JwtPayload = { sub: string; email?: string; iat?: number; exp?: number };

@Injectable()
export class JwtGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth = req.headers['authorization'] as string | undefined;

    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    const token = auth.slice('Bearer '.length).trim();
    const secret = process.env.JWT_SECRET ?? 'dev_secret';

    try {
      const payload = jwt.verify(token, secret) as JwtPayload;
      if (!payload?.sub) {
        throw new UnauthorizedException('Invalid token payload');
      }

      req.user = payload;
      req.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
