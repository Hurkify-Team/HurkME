import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/common/types';
import { OnboardingDto } from './dto/onboarding.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@Controller()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Post('profile/onboarding')
  submitOnboarding(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: OnboardingDto,
  ) {
    return this.profileService.submitOnboarding(user.id, dto);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateProfile(user.id, dto);
  }

  @Get('creators/:id')
  getCreator(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.profileService.getCreatorById(id);
  }

  @Get('profile/saved-creators')
  getSavedCreators(@CurrentUser() user: AuthenticatedUser) {
    return this.profileService.getSavedCreators(user.id);
  }
}
