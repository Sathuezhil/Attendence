import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type DatabaseStatus = 'connected' | 'disconnected';

export interface HealthCheckResult {
  status: 'ok';
  service: string;
  timestamp: string;
  database: DatabaseStatus;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthCheckResult> {
    return {
      status: 'ok',
      service: 'employee-management-api',
      timestamp: new Date().toISOString(),
      database: await this.checkDatabase(),
    };
  }

  private async checkDatabase(): Promise<DatabaseStatus> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return 'connected';
    } catch {
      return 'disconnected';
    }
  }
}
