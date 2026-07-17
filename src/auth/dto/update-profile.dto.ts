import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTeacherProfileDto {
  @ApiProperty({
    example: '+201234567890',
    description: 'Phone number',
  })
  @IsString()
  @MinLength(7)
  phone: string;
}
