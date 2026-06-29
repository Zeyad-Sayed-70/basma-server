import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateFileElementDto {
  @ApiProperty({ description: 'Element title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'File description' })
  @IsOptional()
  @IsString()
  description?: string;
}
