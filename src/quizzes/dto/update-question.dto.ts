import {
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';

export class UpdateQuestionDto {
  @ApiPropertyOptional({
    example: 'ما ناتج (x+3)(x-3)؟',
    description: 'Question text',
  })
  @IsString()
  @MinLength(2)
  @IsOptional()
  text?: string;

  @ApiPropertyOptional({
    enum: QuestionType,
    example: 'MCQ',
    description: 'Question type',
  })
  @IsEnum(QuestionType)
  @IsOptional()
  type?: QuestionType;

  @ApiPropertyOptional({
    example: ['x²-9', 'x²+9', 'x²-6x+9', 'x²+6x+9'],
    description: 'Multiple choice options',
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options?: string[];

  @ApiPropertyOptional({ example: 'x²-9', description: 'Correct answer' })
  @IsString()
  @IsOptional()
  correctAnswer?: string;

  @ApiPropertyOptional({ example: 5, description: 'Marks for this question' })
  @IsNumber()
  @Min(1)
  @IsOptional()
  marks?: number;
}
