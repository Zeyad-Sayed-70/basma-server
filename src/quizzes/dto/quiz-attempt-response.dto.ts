import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class AttemptAnswerDetail {
  @ApiProperty({ example: 'clx...', description: 'Question ID' })
  questionId: string;

  @ApiProperty({ example: 'x²-4', description: "Student's submitted answer" })
  answer: string;

  @ApiProperty({
    example: true,
    description: 'Whether the answer was correct (null for theory questions)',
  })
  correct: boolean | null;

  @ApiProperty({ example: 5, description: 'Marks earned for this question' })
  marksEarned: number;
}

export class QuizAttemptResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'clx...', description: 'Student ID' })
  studentId: string;

  @ApiProperty({ example: 'clx...', description: 'Quiz ID' })
  quizId: string;

  @ApiPropertyOptional({
    example: 15,
    description:
      'Total score (null if not yet graded — theory questions pending)',
  })
  score?: number;

  @ApiProperty({
    example: [
      { questionId: 'clx...', answer: 'x²-4', correct: true, marksEarned: 5 },
    ],
    description: 'Detailed answer results',
  })
  answers: AttemptAnswerDetail[];

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  submittedAt: string;
}

export class AttemptListResponseDto {
  @ApiProperty({ type: [QuizAttemptResponseDto] })
  data: QuizAttemptResponseDto[];

  @ApiProperty({ example: 3 })
  total: number;
}
