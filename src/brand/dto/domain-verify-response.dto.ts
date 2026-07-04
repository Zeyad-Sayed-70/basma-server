import { ApiProperty } from '@nestjs/swagger';

export class DomainVerifyResponseDto {
  @ApiProperty({
    type: Boolean,
    example: true,
    description: 'Whether the domain verification succeeded',
  })
  verified: boolean;

  @ApiProperty({
    type: String,
    example: 'myschool.com',
    description: 'The verified custom domain',
  })
  customDomain: string;

  @ApiProperty({
    type: String,
    example: '2026-07-03T12:00:00.000Z',
    description: 'Timestamp of successful verification',
  })
  verifiedAt: string;
}
