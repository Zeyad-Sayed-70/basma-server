import {
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCourseDto {
  @ApiPropertyOptional({
    example: 'الرياضيات - الجبر',
    description: 'Course title',
  })
  @IsString()
  @MinLength(2)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'مقرر الجبر للصف الأول الثانوي',
    description: 'Optional course description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 199.99,
    description: 'Course price in EGP (0 = free)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;
}
