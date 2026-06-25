import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { StudentStatus } from '@prisma/client';

export class UpdateStudentDto {
  @ApiPropertyOptional({
    example: 'علي أحمد',
    description: 'Student full name',
  })
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'ali@example.com',
    description: 'Student email',
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: '+201234567890',
    description: 'Student phone number',
  })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({
    enum: StudentStatus,
    example: 'ACTIVE',
    description: 'Student status',
  })
  @IsEnum(StudentStatus)
  @IsOptional()
  status?: StudentStatus;

  @ApiPropertyOptional({
    example: 'clx...',
    description: 'Group ID to move the student to',
  })
  @IsString()
  @IsOptional()
  groupId?: string;
}
