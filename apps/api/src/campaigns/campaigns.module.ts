import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { PayoutService } from './payout.service';

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService, PayoutService],
  exports: [CampaignsService, PayoutService],
})
export class CampaignsModule {}
