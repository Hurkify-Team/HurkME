import { IsString } from 'class-validator';

export class PresignUploadDto {
  @IsString()
  fileName!: string;

  @IsString()
  contentType!: string;
}
