import {
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuizDto {
  @ApiPropertyOptional({
    example: 'اختبار الجبر - الوحدة الأولى (معدل)',
    description: 'Quiz title',
  })
  @IsString()
  @MinLength(2)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'اختبار شامل على الوحدة الأولى',
    description: 'Quiz description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 25, description: 'Total marks for the quiz' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  totalMarks?: number;
}
