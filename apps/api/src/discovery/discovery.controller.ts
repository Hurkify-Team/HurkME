import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/types';
import { CreateInteractionDto } from './dto/create-interaction.dto';
import { SearchCreatorsDto } from './dto/search-creators.dto';
import { DiscoveryService } from './discovery.service';

@Controller()
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Get('feed')
  getFeed(@CurrentUser() user: AuthenticatedUser) {
    return this.discoveryService.getFeed(user.id);
  }

  @Get('creators/search')
  searchCreators(@Query() query: SearchCreatorsDto) {
    return this.discoveryService.searchCreators(query);
  }

  @Post('interactions')
  createInteraction(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInteractionDto,
  ) {
    return this.discoveryService.saveInteraction(user.id, dto);
  }
}
