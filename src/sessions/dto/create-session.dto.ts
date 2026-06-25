import {
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SessionType, SessionPlatform } from '@prisma/client';

export class CreateSessionDto {
  @ApiProperty({
    example: 'مراجعة الجبر - الوحدة الأولى',
    description: 'Session title',
  })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({
    example: '2025-09-15T10:00:00.000Z',
    description: 'Session start time (ISO 8601)',
  })
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional({
    example: '2025-09-15T12:00:00.000Z',
    description: 'Session end time (ISO 8601)',
  })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({
    enum: SessionType,
    example: 'LOCAL',
    description:
      'Session delivery mode. LOCAL = in-person (uses location field). ' +
      'ONLINE = virtual (uses platform + meetingUrl fields).',
  })
  @IsEnum(SessionType)
  @IsOptional()
  type?: SessionType;

  @ApiPropertyOptional({
    example: 'قاعة 3 - مركز التعليم, القاهرة',
    description: 'Physical location (required when type=LOCAL)',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    enum: SessionPlatform,
    example: 'ZOOM',
    description: 'Video conferencing platform (used when type=ONLINE)',
  })
  @IsEnum(SessionPlatform)
  @IsOptional()
  platform?: SessionPlatform;

  @ApiPropertyOptional({
    example: 'https://zoom.us/j/123456789',
    description: 'Meeting URL (used when type=ONLINE)',
  })
  @IsUrl()
  @IsOptional()
  meetingUrl?: string;

  @ApiPropertyOptional({
    example: 'يرجى مراجعة الوحدة الأولى قبل الجلسة',
    description: 'Optional notes or instructions for the session',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({
    example: 'clx...',
    description: 'Course ID this session belongs to',
  })
  @IsString()
  courseId: string;
}
