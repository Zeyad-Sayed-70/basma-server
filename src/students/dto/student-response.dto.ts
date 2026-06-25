import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StudentStatus } from '@prisma/client';

export class StudentResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'علي أحمد' })
  name: string;

  @ApiPropertyOptional({ example: 'ali@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+201234567890' })
  phone?: string;

  @ApiProperty({ enum: StudentStatus, example: 'ACTIVE' })
  status: StudentStatus;

  @ApiProperty({ example: 'clx...', description: 'Group ID' })
  groupId: string;

  @ApiProperty({ example: 'clx...' })
  instanceId: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class StudentListResponseDto {
  @ApiProperty({ type: [StudentResponseDto] })
  data: StudentResponseDto[];

  @ApiProperty({ example: 15 })
  total: number;

  @ApiProperty({ example: { active: 10, inactive: 5, limit: 50 } })
  summary: { active: number; inactive: number; limit: number };
}
