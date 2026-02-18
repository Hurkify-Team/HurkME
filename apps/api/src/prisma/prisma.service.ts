import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    const bootstrapConnectEnabled = process.env.PRISMA_BOOTSTRAP_CONNECT === 'true';

    if (!bootstrapConnectEnabled || process.env.SKIP_PRISMA_CONNECT === 'true') {
      this.logger.log(
        'Skipping Prisma bootstrap connection. Enable it with PRISMA_BOOTSTRAP_CONNECT=true.',
      );
      return;
    }

    const timeoutMs = Number(process.env.PRISMA_CONNECT_TIMEOUT_MS ?? 5000);

    try {
      // Do not block API boot indefinitely if the DB handshake is slow.
      await Promise.race([
        Promise.resolve().then(() => this.$connect()),
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
