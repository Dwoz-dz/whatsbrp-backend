import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;
    const fullName = dto.fullName?.trim();

    if (!email) throw new BadRequestException('email is required');
    if (!password) throw new BadRequestException('password is required');
    if (!fullName) throw new BadRequestException('fullName is required');

    const existing = await this.users.findByEmail(email);
    if (existing) throw new BadRequestException('Email already used');

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.users.createUser({
      email,
      fullName,
      passwordHash,
    });

    return user;
  }

  async login(dto: LoginDto) {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password;

    if (!email) throw new BadRequestException('email is required');
    if (!password) throw new BadRequestException('password is required');

    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // نفترض user فيه passwordHash
    const ok = await bcrypt.compare(password, (user as any).passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    // إذا عندك status
    if ((user as any).status && (user as any).status !== 'APPROVED') {
      throw new UnauthorizedException('User not approved');
    }

    const payload = { sub: user.id, email: user.email };
    return { accessToken: await this.jwt.signAsync(payload) };
  }

  async me(user: any) {
    return user;
  }
}
