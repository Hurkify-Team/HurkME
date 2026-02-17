import { Module } from '@nestjs/common';
import { CampaignsModule } from '@/campaigns/campaigns.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [CampaignsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
