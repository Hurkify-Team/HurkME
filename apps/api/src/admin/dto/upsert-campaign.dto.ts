import {
  CampaignStatus,
  CampaignTier,
  Niche,
  PayoutModel,
  PrimaryPlatform,
} from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class UpsertCampaignDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @IsIn(['create', 'open', 'close'])
  action!: 'create' | 'open' | 'close';

  @IsOptional()
  @IsUUID()
  orgId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PrimaryPlatform)
  platform?: PrimaryPlatform;

  @IsOptional()
  @IsEnum(Niche)
  nicheTarget?: Niche;

  @IsOptional()
  @IsEnum(CampaignTier)
  tier?: CampaignTier;

  @IsOptional()
  @IsInt()
  @Min(1000)
  minFollowers?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  maxFollowers?: number;

  @IsOptional()
  @IsObject()
  requiredDeliverables?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  performanceWeights?: Record<string, number>;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  @Min(10_000)
  budgetTotal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  platformFeePct?: number;

  @IsOptional()
  @IsEnum(PayoutModel)
  payoutModel?: PayoutModel;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}
