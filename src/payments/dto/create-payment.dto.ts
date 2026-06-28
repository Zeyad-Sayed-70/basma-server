import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({
    description:
      'ID of the course the student wants to pay for in order to get enrolled. The course must have a price > 0 and the student must not already be enrolled.',
    example: 'clxq8a2b30001jf08m3n4o5p6',
  })
  @IsString()
  courseId: string;

  @ApiPropertyOptional({
    description:
      'Additional metadata as JSON string — will be passed to Paymob extras field and returned in webhook callbacks.',
    example: '{"source": "mobile_app", "discount_code": "WELCOME10"}',
  })
  @IsOptional()
  @IsString()
  metadata?: string;
}
