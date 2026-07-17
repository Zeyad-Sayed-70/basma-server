import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackCategory } from '@prisma/client';

export class CreateFeedbackDto {
  @ApiProperty({
    example: 'I love the new curriculum feature!',
    description: 'Feedback content',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  content: string;

  @ApiPropertyOptional({
    enum: FeedbackCategory,
    example: 'FEATURE_REQUEST',
    description: 'Feedback category',
  })
  @IsEnum(FeedbackCategory)
  @IsOptional()
  category?: FeedbackCategory;
}
