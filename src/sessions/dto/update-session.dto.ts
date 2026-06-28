import {
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUrl,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SessionType, SessionPlatform } from '@prisma/client';

export class UpdateSessionDto {
  @ApiPropertyOptional({
    example: 'مراجعة الجبر - الوحدة الأولى',
    description: 'Session title',
  })
  @IsString()
  @MinLength(2)
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    example: '2025-09-15T10:00:00.000Z',
    description: 'Session start time (ISO 8601)',
  })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({
    example: '2025-09-15T12:00:00.000Z',
    description: 'Session end time (ISO 8601)',
  })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({
    enum: SessionType,
    example: 'ONLINE',
    description: 'Session delivery mode',
  })
  @IsEnum(SessionType)
  @IsOptional()
  type?: SessionType;

  @ApiPropertyOptional({
    example: 'قاعة 3 - مركز التعليم, القاهرة',
    description: 'Physical location (for LOCAL sessions)',
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({
    enum: SessionPlatform,
    example: 'GOOGLE_MEET',
    description: 'Video conferencing platform (for ONLINE sessions)',
  })
  @IsEnum(SessionPlatform)
  @IsOptional()
  platform?: SessionPlatform;

  @ApiPropertyOptional({
    example: 'https://meet.google.com/abc-defg-hij',
    description: 'Meeting URL (for ONLINE sessions)',
  })
  @IsUrl()
  @IsOptional()
  @Transform(({ value }) => value || undefined)
  meetingUrl?: string;

  @ApiPropertyOptional({
    example: 'يرجى مراجعة الوحدة الأولى قبل الجلسة',
    description: 'Optional notes or instructions',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
