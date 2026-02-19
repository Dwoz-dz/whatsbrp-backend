import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';

type JwtPayload = {
  sub: string;
  email?: string;
  iat?: number;
  exp?: number;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly users: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // مهم: ما تخليش undefined باش ما يطيحش TS
      secretOrKey: process.env.JWT_SECRET ?? 'dev_super_secret_change_me',
    });
  }

  async validate(payload: JwtPayload) {
    const userId = payload?.sub;
    if (!userId) throw new UnauthorizedException('Invalid token payload');

    const user = await this.users.findSafeById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    return user; // يصبح req.user
  }
}
