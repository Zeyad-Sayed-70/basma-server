import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignmentResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'واجب الجبر - الوحدة الأولى' })
  title: string;

  @ApiPropertyOptional({ example: 'حل التمارين من 1 إلى 10 في صفحة 25' })
  description?: string;

  @ApiPropertyOptional({ example: '2025-10-01T23:59:00.000Z' })
  dueDate?: string;

  @ApiProperty({ example: 'clx...', description: 'Course ID' })
  courseId: string;

  @ApiProperty({ example: 'clx...' })
  instanceId: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class AssignmentListResponseDto {
  @ApiProperty({ type: [AssignmentResponseDto] })
  data: AssignmentResponseDto[];

  @ApiProperty({ example: 3 })
  total: number;
}
