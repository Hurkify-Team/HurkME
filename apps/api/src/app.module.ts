import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CampaignsModule } from '@/campaigns/campaigns.module';
import { ConfigModule } from '@/config/config.module';
import { DailyStepsModule } from '@/daily-steps/daily-steps.module';
import { DiscoveryModule } from '@/discovery/discovery.module';
import { HealthModule } from '@/health/health.module';
import { JobsModule } from '@/jobs/jobs.module';
import { AdminGuard } from '@/common/guards/admin.guard';
import { AuthGuard } from '@/common/guards/auth.guard';
import { PrismaModule } from '@/prisma/prisma.module';
import { ProfileModule } from '@/profile/profile.module';
import { SearchModule } from '@/search/search.module';
import { UploadsModule } from '@/uploads/uploads.module';
import { UsersModule } from '@/users/users.module';
import { WalletModule } from '@/wallet/wallet.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    PrismaModule,
    ConfigModule,
    UsersModule,
    HealthModule,
    SearchModule,
    JobsModule,
    DiscoveryModule,
    ProfileModule,
    DailyStepsModule,
    CampaignsModule,
    WalletModule,
    UploadsModule,
    AdminModule,
  ],
  providers: [
    AdminGuard,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
