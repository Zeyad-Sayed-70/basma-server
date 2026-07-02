import { IsString, MinLength, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty({
    example: 'واجب الجبر - الوحدة الأولى',
    description: 'Assignment title',
  })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiPropertyOptional({
    example: 'حل التمارين من 1 إلى 10 في صفحة 25',
    description: 'Assignment description / instructions',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: '2025-10-01T23:59:00.000Z',
    description: 'Due date for submission (ISO 8601)',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiProperty({
    example: 'clx...',
    description: 'Course ID this assignment belongs to',
  })
  @IsString()
  courseId: string;

  @ApiPropertyOptional({
    example: 100,
    description: 'Maximum marks / total degree (defaults to 100)',
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  totalMarks?: number;
}
