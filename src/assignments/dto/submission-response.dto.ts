import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmissionResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'clx...', description: 'Student ID' })
  studentId: string;

  @ApiProperty({ example: 'clx...', description: 'Assignment ID' })
  assignmentId: string;

  @ApiPropertyOptional({ example: 'إليك حل التمارين...' })
  content?: string;

  @ApiPropertyOptional({
    example: 'http://localhost:9000/basma-assets/assignments/.../solution.pdf',
    description: 'URL of the uploaded file',
  })
  fileUrl?: string;

  @ApiPropertyOptional({ example: 18, description: 'Grade given by teacher' })
  grade?: number;

  @ApiPropertyOptional({
    example: 'أحسنت! حل ممتاز',
    description: 'Teacher feedback',
  })
  feedback?: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  submittedAt: string;
}

export class SubmissionListResponseDto {
  @ApiProperty({ type: [SubmissionResponseDto] })
  data: SubmissionResponseDto[];

  @ApiProperty({ example: 5 })
  total: number;
}
