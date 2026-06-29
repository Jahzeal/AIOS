import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to the PostgreSQL database.');
    } catch (err: any) {
      this.logger.error(
        'Failed to connect to the database on startup. Ensure PostgreSQL is running. Connection will retry automatically on first query.',
        err.message
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
