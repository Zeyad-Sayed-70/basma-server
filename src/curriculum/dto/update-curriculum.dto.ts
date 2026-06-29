import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateCurriculumDto {
  @ApiPropertyOptional({ description: 'Curriculum title override' })
  @IsOptional()
  @IsString()
  title?: string;
}
