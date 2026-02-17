import { InteractionAction } from '@prisma/client';
import { IsEnum, IsObject, IsOptional, IsUUID } from 'class-validator';

export class CreateInteractionDto {
  @IsUUID()
  targetUserId!: string;

  @IsEnum(InteractionAction)
  action!: InteractionAction;

  @IsOptional()
  @IsObject()
  meta?: Record<string, unknown>;
}
