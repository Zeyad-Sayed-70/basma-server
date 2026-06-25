import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionType, SessionPlatform } from '@prisma/client';

export class SessionResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'مراجعة الجبر - الوحدة الأولى' })
  title: string;

  @ApiProperty({ example: '2025-09-15T10:00:00.000Z' })
  startTime: string;

  @ApiPropertyOptional({ example: '2025-09-15T12:00:00.000Z' })
  endTime?: string;

  @ApiProperty({ enum: SessionType, example: 'LOCAL' })
  type: SessionType;

  @ApiPropertyOptional({ example: 'قاعة 3 - مركز التعليم, القاهرة' })
  location?: string;

  @ApiPropertyOptional({ enum: SessionPlatform, example: 'ZOOM' })
  platform?: SessionPlatform;

  @ApiPropertyOptional({ example: 'https://zoom.us/j/123456789' })
  meetingUrl?: string;

  @ApiPropertyOptional({ example: 'يرجى مراجعة الوحدة الأولى قبل الجلسة' })
  notes?: string;

  @ApiProperty({ example: 'clx...', description: 'Course ID' })
  courseId: string;

  @ApiProperty({ example: 'clx...' })
  instanceId: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class SessionListResponseDto {
  @ApiProperty({ type: [SessionResponseDto] })
  data: SessionResponseDto[];

  @ApiProperty({ example: 8 })
  total: number;
}
