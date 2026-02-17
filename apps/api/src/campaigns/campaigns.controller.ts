import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/types';
import { ListCampaignsDto } from './dto/list-campaigns.dto';
import { SubmitCampaignDto } from './dto/submit-campaign.dto';
import { CampaignsService } from './campaigns.service';

@Controller()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get('campaigns')
  getCampaigns(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListCampaignsDto,
  ) {
    return this.campaignsService.getCampaigns(user.id, query.status);
  }

  @Get('campaigns/:id')
  getCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.campaignsService.getCampaignById(user.id, id);
  }

  @Post('campaigns/:id/apply')
  apply(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.campaignsService.applyToCampaign(user.id, id);
  }

  @Post('campaigns/:id/submit')
  submit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SubmitCampaignDto,
  ) {
    return this.campaignsService.submitCampaignProof(user.id, id, dto);
  }
}
