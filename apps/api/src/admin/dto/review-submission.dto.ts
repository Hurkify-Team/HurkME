import { ReviewStatus } from '@prisma/client';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class ReviewSubmissionDto {
  @IsIn([ReviewStatus.APPROVED, ReviewStatus.REJECTED])
  reviewStatus!: ReviewStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reviewerNotes?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500_000_000)
  verifiedViews?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  verifiedLikes?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  verifiedComments?: number;
}
