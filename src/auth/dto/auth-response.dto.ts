import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TeacherProfile {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'teacher@example.com' })
  email: string;

  @ApiProperty({ example: 'أحمد محمد' })
  name: string;

  @ApiProperty({ example: 'ar' })
  lang: string;

  @ApiProperty({ example: 'clx...' })
  instanceId: string;
}

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  refreshToken: string;

  @ApiProperty({ type: TeacherProfile })
  teacher: TeacherProfile;
}

export class StudentAuthProfile {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'علي أحمد' })
  name: string;

  @ApiPropertyOptional({ example: 'ali@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+201234567890' })
  phone?: string;

  @ApiProperty({ example: 'clx...' })
  groupId: string;

  @ApiProperty({ example: 'clx...' })
  instanceId: string;
}

export class StudentAuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIs...' })
  refreshToken: string;

  @ApiProperty({ type: StudentAuthProfile })
  student: StudentAuthProfile;
}

export class MeResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'teacher@example.com' })
  email: string;

  @ApiProperty({ example: 'أحمد محمد' })
  name: string;

  @ApiProperty({ example: 'ar' })
  lang: string;

  @ApiProperty({ example: 'FREE', enum: ['FREE', 'MID', 'BIG', 'HUGE'] })
  tier: string;

  @ApiProperty({ example: 'clx...' })
  instanceId: string;

  @ApiProperty({ example: 'myschool' })
  subdomain: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;
}

export class StudentMeResponseDto {
  @ApiProperty({ example: 'clx...' })
  id: string;

  @ApiProperty({ example: 'علي أحمد' })
  name: string;

  @ApiPropertyOptional({ example: 'ali@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+201234567890' })
  phone?: string;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' })
  status: string;

  @ApiProperty({ example: 'clx...', description: 'Group ID' })
  groupId: string;

  @ApiProperty({ example: 'clx...', description: 'Instance ID' })
  instanceId: string;

  @ApiProperty({ example: 'clx...', description: 'Group name' })
  groupName: string;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: string;
}
