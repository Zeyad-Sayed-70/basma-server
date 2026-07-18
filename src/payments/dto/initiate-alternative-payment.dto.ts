import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class InitiateAlternativePaymentDto {
  @ApiProperty({
    description: 'ID of the course the student wants to enroll in',
    example: 'clxq8a2b30001jf08m3n4o5p6',
  })
  @IsString()
  courseId: string;

  @ApiProperty({
    description:
      'ID of the teacher payment method the student wants to use',
    example: 'clxq8a2b30001jf08m3n4o5p6',
  })
  @IsString()
  teacherPaymentMethodId: string;
}
