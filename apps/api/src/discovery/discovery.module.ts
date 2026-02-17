import { Module } from '@nestjs/common';
import { SearchModule } from '@/search/search.module';
import { DiscoveryController } from './discovery.controller';
import { DiscoveryService } from './discovery.service';
import { MatchingService } from './matching.service';

@Module({
  imports: [SearchModule],
  controllers: [DiscoveryController],
  providers: [DiscoveryService, MatchingService],
  exports: [DiscoveryService, MatchingService],
})
export class DiscoveryModule {}
