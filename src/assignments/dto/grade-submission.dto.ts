import { IsNumber, IsString, Min, Max, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GradeSubmissionDto {
  @ApiProperty({
    example: 85,
    description: 'Grade / score for the submission (out of assignment maxGrade, default 100)',
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  grade: number;

  @ApiPropertyOptional({
    example: 'أحسنت! حل ممتاز',
    description: 'Optional feedback comment',
  })
  @IsString()
  @IsOptional()
  feedback?: string;
}
