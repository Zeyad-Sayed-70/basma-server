import { IsNumber, IsString, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeSubmissionDto {
  @ApiProperty({
    example: 18,
    description: 'Grade / score for the submission (0-100 or custom scale)',
  })
  @IsNumber()
  @Min(0)
  @Max(10000)
  grade: number;

  @ApiPropertyOptional({
    example: 'أحسنت! حل ممتاز',
    description: 'Optional feedback comment',
  })
  @IsString()
  @IsOptional()
  feedback?: string;
}
