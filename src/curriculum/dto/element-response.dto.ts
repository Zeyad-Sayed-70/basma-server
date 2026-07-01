import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class VideoDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'Introduction Video' })
  title: string;

  @ApiPropertyOptional({ example: 'Course overview video' })
  description?: string;

  @ApiProperty({ example: 'https://minio.example.com/curriculum/videos/...' })
  videoUrl: string;

  @ApiProperty({ example: 'video/mp4' })
  mimeType: string;

  @ApiProperty({ example: 52428800 })
  fileSize: number;

  @ApiPropertyOptional({ example: 300 })
  durationSeconds?: number;
}

class FileDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'Lecture Notes' })
  title: string;

  @ApiPropertyOptional({ example: 'Chapter 1 notes' })
  description?: string;

  @ApiProperty({ example: 'lecture-1.pdf' })
  filename: string;

  @ApiProperty({ example: 'https://minio.example.com/curriculum/files/...' })
  fileUrl: string;

  @ApiProperty({ example: 'application/pdf' })
  mimeType: string;

  @ApiProperty({ example: 1048576 })
  fileSize: number;
}

class RichContentDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'Lesson Content' })
  title: string;

  @ApiProperty({
    example: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] },
    ],
  })
  bodyJson: Record<string, unknown>[];
}

class ReferenceDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'Quiz Title' })
  title: string;
}

class SessionSummaryDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'Live Session' })
  title: string;

  @ApiProperty({ example: '2025-01-15T10:00:00.000Z' })
  startTime: Date;

  @ApiPropertyOptional({ example: '2025-01-15T11:00:00.000Z' })
  endTime?: Date;

  @ApiProperty({ example: 'LOCAL' })
  type: string;

  @ApiPropertyOptional({ example: 'Room 101' })
  location?: string;

  @ApiPropertyOptional({ example: 'ZOOM' })
  platform?: string;

  @ApiPropertyOptional({ example: 'https://zoom.us/j/123' })
  meetingUrl?: string;
}

export class ElementResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'clx...' })
  curriculumId: string;

  @ApiProperty({ example: 'VIDEO' })
  type: string;

  @ApiProperty({ example: 'Introduction' })
  title: string;

  @ApiProperty({ example: 1000 })
  position: number;

  @ApiProperty({ example: true })
  required: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string;

  @ApiPropertyOptional({ type: VideoDto })
  video?: VideoDto;

  @ApiPropertyOptional({ type: FileDto })
  file?: FileDto;

  @ApiPropertyOptional({ type: RichContentDto })
  richContent?: RichContentDto;

  @ApiPropertyOptional({ type: ReferenceDto })
  quiz?: ReferenceDto;

  @ApiPropertyOptional({ type: ReferenceDto })
  assignment?: ReferenceDto;

  @ApiPropertyOptional({ type: SessionSummaryDto })
  session?: SessionSummaryDto;
}

class ElementProgressSummaryDto {
  @ApiProperty({ example: 'NOT_STARTED' })
  status: string;

  @ApiProperty({ example: 0 })
  progressPercent: number;

  @ApiPropertyOptional()
  completedAt: Date | null;
}

export class ElementWithProgressDto extends ElementResponseDto {
  @ApiProperty({ type: ElementProgressSummaryDto })
  progress: ElementProgressSummaryDto;
}
