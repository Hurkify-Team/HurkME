import { PartialType } from '@nestjs/swagger';
import { OnboardingDto } from './onboarding.dto';

export class UpdateProfileDto extends PartialType(OnboardingDto) {}
