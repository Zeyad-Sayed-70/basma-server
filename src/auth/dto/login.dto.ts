import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'teacher@basma.demo',
    description: 'Registered email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Demo@123', description: 'Account password' })
  @IsString()
  password: string;
}
