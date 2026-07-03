import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CourseStudentCount {
  @ApiProperty({ example: 15 })
  total: number;
}

export class CourseResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'الرياضيات - الجبر' })
  title: string;

  @ApiPropertyOptional({ example: 'مقرر الجبر للصف الأول الثانوي' })
  description?: string;

  @ApiProperty({ example: 0, description: 'Course price in EGP' })
  price: number;

  @ApiPropertyOptional({ description: 'Course image URL' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Course image file size in bytes' })
  imageFileSize?: number;

  @ApiProperty({ example: 'clx...', description: 'Group ID' })
  groupId: string;

  @ApiProperty({ example: 'clx...' })
  instanceId: string;

  @ApiProperty({
    type: CourseStudentCount,
    description: 'Enrolled student count',
  })
  studentCount: CourseStudentCount;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the current student is enrolled',
  })
  isEnrolled?: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class CourseListResponseDto {
  @ApiProperty({ type: [CourseResponseDto] })
  data: CourseResponseDto[];

  @ApiProperty({ example: 5 })
  total: number;
}
