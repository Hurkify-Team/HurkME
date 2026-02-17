import { IsOptional, IsString } from 'class-validator';

export class ListCampaignsDto {
  @IsOptional()
  @IsString()
  status?: string;
}
