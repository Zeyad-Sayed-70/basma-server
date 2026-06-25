import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegistrationMode } from '@prisma/client';

class StudentCount {
  @ApiProperty({ example: 5 })
  active: number;

  @ApiProperty({ example: 2 })
  inactive: number;
}

export class GroupResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'الصف الأول الثانوي' })
  name: string;

  @ApiPropertyOptional({ example: 'شعبة علمي رياضة' })
  description?: string;

  @ApiProperty({ enum: RegistrationMode, example: 'OPEN' })
  registrationMode: RegistrationMode;

  @ApiPropertyOptional({ example: 'abc123def' })
  invitationCode?: string;

  @ApiProperty({ example: 'clx...' })
  instanceId: string;

  @ApiProperty({ type: StudentCount })
  studentCount: StudentCount;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt: string;
}

export class GroupListResponseDto {
  @ApiProperty({ type: [GroupResponseDto] })
  data: GroupResponseDto[];

  @ApiProperty({ example: 3 })
  total: number;

  @ApiProperty({
    example: { groups: 5, students: 50 },
    description: 'Current tier limits',
  })
  limits: { groups: number; students: number };
}
