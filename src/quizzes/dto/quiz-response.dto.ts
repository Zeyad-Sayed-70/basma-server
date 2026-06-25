import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class QuizQuestionCount {
  @ApiProperty({ example: 5 })
  questions: number;
}

export class QuizResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'اختبار الجبر - الوحدة الأولى' })
  title: string;

  @ApiPropertyOptional({ example: 'اختبار شامل على الوحدة الأولى' })
  description?: string;

  @ApiProperty({ example: 20 })
  totalMarks: number;

  @ApiProperty({ example: 'clx...', description: 'Course ID' })
  courseId: string;

  @ApiProperty({ example: 'clx...' })
  instanceId: string;

  @ApiProperty({
    type: QuizQuestionCount,
    description: 'Number of questions in the quiz',
  })
  questionCount: QuizQuestionCount;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class QuizListResponseDto {
  @ApiProperty({ type: [QuizResponseDto] })
  data: QuizResponseDto[];

  @ApiProperty({ example: 3 })
  total: number;
}

export class QuizDetailResponseDto extends QuizResponseDto {
  @ApiProperty({
    type: () => [Object],
    description: 'List of questions in the quiz',
  })
  questions?: Record<string, unknown>[];
}
