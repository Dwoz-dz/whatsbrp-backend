import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('ping')
  ping() {
    return { status: 'alive' };
  }

  @Get('db-test')
  async dbTest() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { db: 'connected' };
    } catch (error: any) {
      return {
        db: 'error',
        message: error?.message || 'unknown',
      };
    }
  }
}
