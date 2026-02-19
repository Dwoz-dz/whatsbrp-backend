import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    if (!email || !email.trim()) {
      throw new BadRequestException('email is required');
    }
    return this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
  }

  // (إذا عندك findSafeById خليه كما هو)
}
