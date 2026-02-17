import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    if (process.env.SKIP_PRISMA_CONNECT === 'true') {
      this.logger.warn('Skipping Prisma bootstrap connection (SKIP_PRISMA_CONNECT=true).');
      return;
    }

    const timeoutMs = Number(process.env.PRISMA_CONNECT_TIMEOUT_MS ?? 5000);

    try {
      await Promise.race([
        this.$connect(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Prisma connect timeout after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Prisma connection deferred during bootstrap: ${reason}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    try {
      await this.$disconnect();
    } catch {
      // Ignore disconnect errors when startup never established a DB connection.
    }
  }
}
