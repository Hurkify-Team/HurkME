import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/types';
import { CompleteStepDto } from './dto/complete-step.dto';
import { DailyStepsService } from './daily-steps.service';

@Controller()
export class DailyStepsController {
  constructor(private readonly dailyStepsService: DailyStepsService) {}

  @Get('daily-steps/today')
  getToday(@CurrentUser() user: AuthenticatedUser) {
    return this.dailyStepsService.getTodaySteps(user.id);
  }

  @Post('daily-steps/:id/complete')
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CompleteStepDto,
  ) {
    return this.dailyStepsService.completeStep(user.id, id, dto.evidenceUrl);
  }

  @Get('streaks')
  getStreak(@CurrentUser() user: AuthenticatedUser) {
    return this.dailyStepsService.getStreak(user.id);
  }
}
