import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';

export class QuestionResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'ما ناتج (x+2)(x-2)؟' })
  text: string;

  @ApiProperty({ enum: QuestionType, example: 'MCQ' })
  type: QuestionType;

  @ApiPropertyOptional({ example: ['x²-4', 'x²+4', 'x²-4x+4', 'x²+4x+4'] })
  options?: string[];

  @ApiPropertyOptional({
    example: 'x²-4',
    description: 'Correct answer (hidden from students in responses)',
  })
  correctAnswer?: string;

  @ApiProperty({ example: 5 })
  marks: number;

  @ApiProperty({ example: 'clx...', description: 'Quiz ID' })
  quizId: string;

  @ApiProperty({ example: 'clx...' })
  instanceId: string;
}

export class QuestionListResponseDto {
  @ApiProperty({ type: [QuestionResponseDto] })
  data: QuestionResponseDto[];

  @ApiProperty({ example: 5 })
  total: number;
}
