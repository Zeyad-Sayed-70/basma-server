import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StudentLoginDto {
  @ApiProperty({ example: 'ali@example.com', description: 'Student email' })
  @IsString()
  @MinLength(2)
  email: string;

  @ApiProperty({ example: '1234', description: 'Student password or PIN' })
  @IsString()
  @MinLength(4)
  password: string;
}
