import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class CreateVideoElementDto {
  @ApiProperty({ description: 'Element title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Video description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Duration in seconds' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}
