import { IsString, IsOptional, MinLength, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StudentSignupDto {
  @ApiProperty({ example: 'علي أحمد', description: 'Student full name' })
  @IsString()
  @MinLength(2)
  name: string;

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
    example: '1234',
    description:
      'Account password (min 4 characters). If set, enables email+password login on other devices. Recommended if email is provided.',
  })
  @IsString()
  @MinLength(4)
  @IsOptional()
  password?: string;

  @ApiProperty({
    example: 'INV234',
    description:
      'Invitation code for closed groups, or group ID for open registration',
  })
  @IsString()
  code: string;
}
