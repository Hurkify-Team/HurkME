import { Module } from '@nestjs/common';
import { ConfigModule } from '@/config/config.module';
import { DailyStepsModule } from '@/daily-steps/daily-steps.module';
import { DiscoveryModule } from '@/discovery/discovery.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { WorkerRunnerService } from './worker-runner.service';

@Module({
  imports: [PrismaModule, ConfigModule, DailyStepsModule, DiscoveryModule],
  providers: [WorkerRunnerService],
  exports: [WorkerRunnerService],
})
export class WorkerModule {}
