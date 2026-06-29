import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateCurriculumDto {
  @ApiPropertyOptional({
    description: 'Optional override title for curriculum',
  })
  @IsOptional()
  @IsString()
  title?: string;
}
