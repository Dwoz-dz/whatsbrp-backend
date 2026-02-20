import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller()
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get('ping')
  ping() {
    return { status: 'alive' };
  }

  @Get('db-test')
  async dbTest() {
    try {
      await this.dataSource.query('SELECT 1');
      return { db: 'connected' };
    } catch (error: any) {
      return { db: 'error', message: error?.message ?? 'unknown error' };
    }
  }
}
