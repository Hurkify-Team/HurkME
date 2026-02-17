import {
  AudienceRegion,
  Goal,
  GrowthStyle,
  Niche,
  PrimaryPlatform,
} from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class OnboardingDto {
  @IsEnum(PrimaryPlatform)
  primaryPlatform!: PrimaryPlatform;

  @IsEnum(Niche)
  primaryNiche!: Niche;

  @IsArray()
  @IsEnum(Niche, { each: true })
  @IsOptional()
  secondaryNiches?: Niche[];

  @IsInt()
  @Min(1000)
  followerCount!: number;

  @IsEnum(Goal)
  goal!: Goal;

  @IsEnum(GrowthStyle)
  growthStyle!: GrowthStyle;

  @IsEnum(AudienceRegion)
  audienceRegion!: AudienceRegion;

  @IsOptional()
  @IsString()
  audienceAgeBand?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsString()
  @MaxLength(60)
  displayName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  bio?: string;

  @IsOptional()
  @ValidateIf((obj) => obj.photoUrl !== null)
  @IsString()
  photoUrl?: string;

  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;
}
