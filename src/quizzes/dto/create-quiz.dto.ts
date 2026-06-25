import {
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuizDto {
  @ApiProperty({
    example: 'اختبار الجبر - الوحدة الأولى',
    description: 'Quiz title',
  })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional({
    example: 'اختبار شامل على الوحدة الأولى',
    description: 'Optional quiz description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 20, description: 'Total marks for the quiz' })
  @IsNumber()
  @Min(1)
  totalMarks: number;

  @ApiProperty({
    example: 'clx...',
    description: 'Course ID this quiz belongs to',
  })
  @IsString()
  courseId: string;
}
