import { IsString, MinLength, IsOptional, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAssignmentDto {
  @ApiPropertyOptional({
    example: 'واجب الجبر - الوحدة الأولى (معدل)',
    description: 'Assignment title',
  })
  @IsString()
  @MinLength(2)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: 'حل التمارين من 1 إلى 15 في صفحة 30',
    description: 'Assignment description',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: '2025-10-05T23:59:00.000Z',
    description: 'Due date',
  })
  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @ApiPropertyOptional({
    example: 100,
    description: 'Maximum marks / total degree (defaults to 100)',
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  totalMarks?: number;
}
