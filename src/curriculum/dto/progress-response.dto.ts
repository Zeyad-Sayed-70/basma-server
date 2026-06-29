import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ElementProgressResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'clx...' })
  studentId: string;

  @ApiProperty({ example: 'clx...' })
  elementId: string;

  @ApiProperty({ example: 'IN_PROGRESS' })
  status: string;

  @ApiProperty({ example: 50 })
  progressPercent: number;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  startedAt?: Date;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00.000Z' })
  completedAt?: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class CourseProgressResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'clx...' })
  studentId: string;

  @ApiProperty({ example: 'clx...' })
  courseId: string;

  @ApiProperty({ example: 10 })
  totalRequired: number;

  @ApiProperty({ example: 7 })
  completedRequired: number;

  @ApiProperty({ example: 70 })
  percent: number;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string;
}

class ElementProgressItemDto {
  @ApiProperty({ example: 'clx...' })
  elementId: string;

  @ApiProperty({ example: 'IN_PROGRESS' })
  status: string;

  @ApiProperty({ example: 50 })
  progressPercent: number;

  @ApiPropertyOptional()
  completedAt: Date | null;
}

export class CurriculumProgressResponseDto {
  @ApiProperty({ type: [ElementProgressItemDto] })
  elementProgress: ElementProgressItemDto[];

  @ApiProperty({ type: CourseProgressResponseDto })
  courseProgress: CourseProgressResponseDto;
}
