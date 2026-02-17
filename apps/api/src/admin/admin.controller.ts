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
import { AdminGuard } from '@/common/guards/admin.guard';
import { AdminService } from './admin.service';
import { ListSubmissionsDto } from './dto/list-submissions.dto';
import { ReviewSubmissionDto } from './dto/review-submission.dto';
import { UpsertCampaignDto } from './dto/upsert-campaign.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('campaigns')
  upsertCampaign(@Body() dto: UpsertCampaignDto) {
    return this.adminService.upsertCampaign(dto);
  }

  @Get('submissions')
  listSubmissions(@Query() query: ListSubmissionsDto) {
    return this.adminService.listSubmissions(query);
  }

  @Post('submissions/:id/review')
  reviewSubmission(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: ReviewSubmissionDto,
  ) {
    return this.adminService.reviewSubmission(id, dto);
  }

  @Post('campaigns/:id/compute-payouts')
  computePayouts(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.adminService.computePayouts(id);
  }

  @Get('campaigns/:id/payout-report')
  async payoutReport(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() response: Response,
  ) {
    const csv = await this.adminService.getPayoutReport(id);
    response.setHeader('Content-Type', 'text/csv');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="campaign-${id}-payout-report.csv"`,
    );
    response.send(csv);
  }
}
