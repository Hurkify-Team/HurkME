import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';
import { buildBullConnectionOptions } from './bull-connection';
import {
  CAMPAIGNS_QUEUE,
  DAILY_STEPS_QUEUE,
  MATCHES_QUEUE,
} from './queues.constants';

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private static readonly INIT_TIMEOUT_MS = 4000;
  private readonly logger = new Logger(JobsService.name);
  private readonly connection = buildBullConnectionOptions();
  private readonly dailyStepsQueue: Queue;
  private readonly matchesQueue: Queue;
  private readonly campaignsQueue: Queue;

  constructor() {
    this.dailyStepsQueue = new Queue(DAILY_STEPS_QUEUE, {
      connection: this.connection,
    });

    this.matchesQueue = new Queue(MATCHES_QUEUE, {
      connection: this.connection,
    });

    this.campaignsQueue = new Queue(CAMPAIGNS_QUEUE, {
      connection: this.connection,
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await Promise.race([
        this.scheduleRecurringJobs(),
        new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  `Redis/BullMQ init timeout after ${JobsService.INIT_TIMEOUT_MS}ms`,
                ),
              ),
            JobsService.INIT_TIMEOUT_MS,
          );
        }),
      ]);
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Skipping recurring job scheduling: ${reason}`);
    }
  }

  async scheduleRecurringJobs(): Promise<void> {
    await this.dailyStepsQueue.add(
      'assign-daily-steps',
      {},
      {
        jobId: 'assign-daily-steps-6am',
        repeat: { pattern: '0 6 * * *' },
      },
    );

    await this.matchesQueue.add(
      'refresh-all-matches',
      {},
      {
        jobId: 'refresh-all-matches-nightly',
        repeat: { pattern: '0 2 * * *' },
      },
    );

    await this.dailyStepsQueue.add(
      'clean-expired-steps',
      {},
      {
        jobId: 'clean-expired-steps-nightly',
        repeat: { pattern: '30 1 * * *' },
      },
    );

    await this.matchesQueue.add(
      'refresh-active-feeds',
      {},
      {
        jobId: 'refresh-active-feeds-every-2h',
        repeat: { pattern: '15 */2 * * *' },
      },
    );

    await this.campaignsQueue.add(
      'auto-close-campaigns',
      {},
      {
        jobId: 'auto-close-campaigns-half-hourly',
        repeat: { pattern: '*/30 * * * *' },
      },
    );

    this.logger.log('Recurring jobs scheduled');
  }

  async enqueueUserMatchRefresh(userId: string): Promise<void> {
    await this.matchesQueue.add(
      'refresh-user-matches',
      { userId },
      {
        removeOnComplete: true,
      },
    );
  }

  async enqueueFeedRefresh(userId: string): Promise<void> {
    await this.matchesQueue.add(
      'refresh-user-feed',
      { userId },
      {
        removeOnComplete: true,
      },
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.dailyStepsQueue.close(),
      this.matchesQueue.close(),
      this.campaignsQueue.close(),
    ]);
  }
}
