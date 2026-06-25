import { ApiProperty } from '@nestjs/swagger';

class EnrolledStudent {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'علي أحمد' })
  name: string;

  @ApiProperty({ example: 'ali@example.com' })
  email?: string;
}

export class EnrollmentResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'clx...', description: 'Course ID' })
  courseId: string;

  @ApiProperty({ example: 'clx...', description: 'Student ID' })
  studentId: string;

  @ApiProperty({ type: EnrolledStudent })
  student: EnrolledStudent;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  enrolledAt: string;
}

export class EnrollmentListResponseDto {
  @ApiProperty({ type: [EnrollmentResponseDto] })
  data: EnrollmentResponseDto[];

  @ApiProperty({ example: 10 })
  total: number;
}
