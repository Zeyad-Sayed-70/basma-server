import {
  IsString,
  MinLength,
  IsOptional,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({ example: 'الرياضيات - الجبر', description: 'Course title' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional({
    example: 'مقرر الجبر للصف الأول الثانوي',
    description: 'Optional course description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Course price in EGP (0 = free)',
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @ApiProperty({
    example: 'clx...',
    description: 'Group ID this course belongs to',
  })
  @IsString()
  groupId: string;
}
