import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  MaxLength,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';

export class SubmitCampaignDto {
  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  proofLinks!: string[];

  @IsArray()
  @ArrayMaxSize(10)
  @IsUrl({}, { each: true })
  proofMediaUrls!: string[];

  @IsInt()
  @Min(0)
  @Max(500_000_000)
  claimedViews!: number;

  @IsInt()
  @Min(0)
  @Max(100_000_000)
  claimedLikes!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  claimedComments?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
