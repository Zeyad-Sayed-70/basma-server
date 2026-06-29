import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ElementWithProgressDto } from './element-response.dto';

class CurriculumCount {
  @ApiProperty({ example: 5 })
  elements: number;
}

export class CurriculumResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'clx...' })
  courseId: string;

  @ApiPropertyOptional({ example: 'Math 101 Curriculum' })
  title?: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string;

  @ApiPropertyOptional({ type: CurriculumCount })
  _count?: CurriculumCount;

  @ApiPropertyOptional({ type: [ElementWithProgressDto] })
  elements?: ElementWithProgressDto[];

  @ApiPropertyOptional()
  courseProgress?: Record<string, unknown>;
}
