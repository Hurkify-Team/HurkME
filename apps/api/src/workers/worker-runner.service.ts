import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { CampaignsService } from '@/campaigns/campaigns.service';
import { DailyStepsService } from '@/daily-steps/daily-steps.service';
import { DiscoveryService } from '@/discovery/discovery.service';
import { MatchingService } from '@/discovery/matching.service';
import { buildBullConnectionOptions } from '@/jobs/bull-connection';
import {
  CAMPAIGNS_QUEUE,
  DAILY_STEPS_QUEUE,
  MATCHES_QUEUE,
} from '@/jobs/queues.constants';

@Injectable()
export class WorkerRunnerService implements OnModuleDestroy {
  private readonly logger = new Logger(WorkerRunnerService.name);
  private readonly connection = buildBullConnectionOptions();

  private readonly workers: Worker[] = [];

  constructor(
    private readonly dailyStepsService: DailyStepsService,
    private readonly matchingService: MatchingService,
    private readonly discoveryService: DiscoveryService,
    private readonly campaignsService: CampaignsService,
  ) {}

  start() {
    const dailyStepsWorker = new Worker(
      DAILY_STEPS_QUEUE,
      async (job: Job) => {
        if (job.name === 'assign-daily-steps') {
          this.logger.log('Running daily step assignments');
          const count = await this.dailyStepsService.assignDailyStepsForAllUsers();
          return { assignedForUsers: count };
        }

        if (job.name === 'clean-expired-steps') {
          this.logger.log('Cleaning stale assigned daily steps');
          const updated = await this.dailyStepsService.cleanExpiredAssignedSteps();
          return { markedSkipped: updated };
        }

        return null;
      },
      {
        connection: this.connection,
        concurrency: 2,
      },
    );

    const matchesWorker = new Worker(
      MATCHES_QUEUE,
      async (job: Job) => {
        if (job.name === 'refresh-all-matches') {
          this.logger.log('Refreshing matches for all users');
          const count = await this.matchingService.refreshAllMatches();
          return { refreshedUsers: count };
        }

        if (job.name === 'refresh-user-matches') {
          const userId = String(job.data.userId ?? '');
          if (!userId) {
            return null;
          }
          const count = await this.matchingService.refreshMatchesForUser(userId);
          return { userId, matches: count };
        }

        if (job.name === 'refresh-user-feed') {
          const userId = String(job.data.userId ?? '');
          if (!userId) {
            return null;
          }

          await this.discoveryService.refreshFeed(userId);
          return { userId };
        }

        if (job.name === 'refresh-active-feeds') {
          this.logger.log('Refreshing feeds for active creators');
          const refreshedUsers = await this.discoveryService.refreshFeedsForActiveUsers();
          return { refreshedUsers };
        }

        return null;
      },
      {
        connection: this.connection,
        concurrency: 4,
      },
    );

    const campaignsWorker = new Worker(
      CAMPAIGNS_QUEUE,
      async (job: Job) => {
        if (job.name === 'auto-close-campaigns') {
          this.logger.log('Auto-closing expired campaigns');
          const closed = await this.campaignsService.autoCloseExpiredCampaigns();
          return { closed };
        }

        return null;
      },
      {
        connection: this.connection,
        concurrency: 1,
      },
    );

    dailyStepsWorker.on('failed', (job, error) => {
      this.logger.error(`Daily steps job failed: ${job?.id ?? 'unknown'}`, error);
    });

    matchesWorker.on('failed', (job, error) => {
      this.logger.error(`Match job failed: ${job?.id ?? 'unknown'}`, error);
    });

    campaignsWorker.on('failed', (job, error) => {
      this.logger.error(`Campaign job failed: ${job?.id ?? 'unknown'}`, error);
    });

    this.workers.push(dailyStepsWorker, matchesWorker, campaignsWorker);
    this.logger.log('Workers started');
  }

  async onModuleDestroy(): Promise<void> {
    for (const worker of this.workers) {
      await worker.close();
    }
  }
}
