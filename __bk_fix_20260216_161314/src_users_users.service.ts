import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) throw new BadRequestException('email is required');

    return this.prisma.user.findUnique({
      where: { email: normalized },
    });
  }

  async findSafeById(id: string) {
    if (!id?.trim()) return null;

    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}
