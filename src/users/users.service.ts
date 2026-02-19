import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type CreateUserInput = {
  email: string;
  fullName: string;
  passwordHash: string;
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeEmail(email: string) {
    const e = email?.trim().toLowerCase();
    if (!e) throw new BadRequestException('email is required');
    return e;
  }

  findByEmail(email: string) {
    const normalized = this.normalizeEmail(email);
    return this.prisma.user.findUnique({ where: { email: normalized } });
  }

  async createUser(input: CreateUserInput) {
    const email = this.normalizeEmail(input.email);
    const fullName = input.fullName?.trim();
    if (!fullName) throw new BadRequestException('fullName is required');
    if (!input.passwordHash) throw new BadRequestException('passwordHash is required');

    return this.prisma.user.create({
      data: {
        email,
        fullName,
        passwordHash: input.passwordHash,
        // إذا عندك enum status: PENDING/APPROVED... خليه PENDING افتراضيا
        status: 'PENDING',
      } as any,
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

  approveUser(id: string) {
    if (!id?.trim()) throw new BadRequestException('id is required');

    return this.prisma.user.update({
      where: { id },
      data: { status: 'APPROVED' } as any,
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
