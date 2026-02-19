import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { JwtGuard } from './jwt.guard';

type AuthedRequest = Request & { userId?: string };

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
  ) {}

  @Post('register')
  register(
    @Body() body: { email: string; password: string; fullName?: string },
  ) {
    return this.auth.register(body);
  }

  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body);
  }

  @UseGuards(JwtGuard)
  @Get('me')
  async me(@Req() req: AuthedRequest) {
    const userId = req.userId;
    if (!userId) throw new UnauthorizedException('Missing token');

    const user = await this.users.findSafeById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    return user;
  }
}
