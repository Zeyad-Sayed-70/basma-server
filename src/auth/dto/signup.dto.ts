import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({
    example: 'teacher@example.com',
    description: 'Teacher email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Demo@123',
    description: 'Password (min 8 characters)',
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    example: 'أحمد محمد',
    description: 'Full name in Arabic or English',
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: '+201234567890',
    description: 'Phone number',
  })
  @IsString()
  @MinLength(7)
  phone: string;

  @ApiPropertyOptional({
    example: 'myschool',
    description:
      'Subdomain for the instance (auto-generated from name if omitted)',
  })
  @IsString()
  @IsOptional()
  subdomain?: string;

  @ApiPropertyOptional({
    example: 'ar',
    enum: ['ar', 'en'],
    description: 'Preferred language',
  })
  @IsOptional()
  @IsIn(['ar', 'en'])
  lang?: string;
}
