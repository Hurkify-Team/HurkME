import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AdminGuard } from '@/common/guards/admin.guard';
import type { AuthenticatedUser } from '@/common/types';
import { InviteCreatorDto } from './dto/invite-creator.dto';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { ListCampaignsAdminDto } from './dto/list-campaigns-admin.dto';
import { AdminService } from './admin.service';
import { ListSubmissionsDto } from './dto/list-submissions.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { UpsertCampaignDto } from './dto/upsert-campaign.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('campaigns')
  listCampaigns(@Query() query: ListCampaignsAdminDto) {
    return this.adminService.listCampaigns(query);
  }

  @Post('campaigns')
  upsertCampaign(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpsertCampaignDto,
  ) {
    return this.adminService.upsertCampaign(dto, user.id);
  }

  @Post('campaigns/:id/invite')
  inviteCreator(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: InviteCreatorDto,
  ) {
    return this.adminService.inviteCreator(id, dto.userId, user.id);
  }

  @Get('submissions')
  listSubmissions(@Query() query: ListSubmissionsDto) {
    return this.adminService.listSubmissions(query);
  }

  @Post('submissions/:id/review')
  reviewSubmission(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.adminService.reviewSubmission(id, dto, user.id);
  }

  @Post('campaigns/:id/compute-payouts')
  computePayouts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.adminService.computePayouts(id, user.id);
  }

  @Get('campaigns/:id/payout-report')
  async payoutReport(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() response: Response,
  ) {
    const csv = await this.adminService.getPayoutReport(id, user.id);
    response.setHeader('Content-Type', 'text/csv');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="campaign-${id}-payout-report.csv"`,
    );
    response.send(csv);
  }

  @Get('audit-logs')
  listAuditLogs(@Query() query: ListAuditLogsDto) {
    return this.adminService.listAuditLogs(query);
  }
}
