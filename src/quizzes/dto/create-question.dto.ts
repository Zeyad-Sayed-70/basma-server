import {
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';

export class CreateQuestionDto {
  @ApiProperty({ example: 'ما ناتج (x+2)(x-2)؟', description: 'Question text' })
  @IsString()
  @MinLength(2)
  text: string;

  @ApiProperty({
    enum: QuestionType,
    example: 'MCQ',
    description: 'Question type: MCQ (auto-graded) or THEORY (teacher graded)',
  })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiPropertyOptional({
    example: ['x²-4', 'x²+4', 'x²-4x+4', 'x²+4x+4'],
    description: 'Multiple choice options (required for MCQ type)',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @ApiPropertyOptional({
    example: 'x²-4',
    description: 'Correct answer (used for auto-grading MCQ)',
  })
  @IsString()
  @IsOptional()
  correctAnswer?: string;

  @ApiProperty({ example: 5, description: 'Marks for this question' })
  @IsNumber()
  @Min(1)
  marks: number;
}
