import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max } from 'class-validator';

export class ProgressUpdateDto {
  @ApiProperty({ description: 'Progress percentage (0-100)' })
  @IsInt()
  @Min(0)
  @Max(100)
  progressPercent: number;
}
