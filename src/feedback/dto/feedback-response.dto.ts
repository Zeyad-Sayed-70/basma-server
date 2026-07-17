import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FeedbackCategory, FeedbackSenderRole } from '@prisma/client';

export class FeedbackResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'I love the new curriculum feature!' })
  content: string;

  @ApiPropertyOptional({ enum: FeedbackCategory, example: 'FEATURE_REQUEST' })
  category?: FeedbackCategory;

  @ApiProperty({ enum: FeedbackSenderRole, example: 'TEACHER' })
  senderRole: FeedbackSenderRole;

  @ApiProperty({ example: 'clx...' })
  senderId: string;

  @ApiProperty({ example: 'أحمد علي' })
  senderName: string;

  @ApiProperty({ example: 'clx...' })
  instanceId: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;
}
