import { IsOptional, IsString } from 'class-validator';

export class CompleteStepDto {
  @IsOptional()
  @IsString()
  evidenceUrl?: string;
}
