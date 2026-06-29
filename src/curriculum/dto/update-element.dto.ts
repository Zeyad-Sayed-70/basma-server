import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateElementDto {
  @ApiPropertyOptional({ description: 'Element title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Whether completion is required' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    description: 'Rich content body JSON (for RICH_CONTENT type)',
  })
  @IsOptional()
  bodyJson?: Record<string, unknown>[];

  @ApiPropertyOptional({ description: 'Video description (for VIDEO type)' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'File description (for FILE type)' })
  @IsOptional()
  @IsString()
  fileDescription?: string;
}
