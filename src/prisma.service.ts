import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from './generated/prisma/client.js';
import { envs } from './config/index.js';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private logger = new Logger(PrismaService.name);
  constructor() {
    const adapter = new PrismaPg({
      connectionString: envs.DATABASE_URL,
    });
    super({ adapter });
    this.logger.log(
      `PrismaService initialized with database URL: ${envs.DATABASE_URL}`,
    );
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('PrismaService connected to the database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('PrismaService disconnected from the database');
  }
}
