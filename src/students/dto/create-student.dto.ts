import { IsString, MinLength, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStudentDto {
  @ApiProperty({ example: 'علي أحمد', description: 'Student full name' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiPropertyOptional({
    example: 'ali@example.com',
    description: 'Student email (unique within instance)',
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

  @ApiProperty({
    example: 'clx...',
    description: 'Group ID to assign the student to',
  })
  @IsString()
  groupId: string;
}
