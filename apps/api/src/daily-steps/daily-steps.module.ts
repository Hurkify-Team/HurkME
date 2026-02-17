import { Module } from '@nestjs/common';
import { DailyStepsController } from './daily-steps.controller';
import { DailyStepsService } from './daily-steps.service';

@Module({
  controllers: [DailyStepsController],
  providers: [DailyStepsService],
  exports: [DailyStepsService],
})
export class DailyStepsModule {}
