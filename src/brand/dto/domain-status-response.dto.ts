import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DomainStatusResponseDto {
  @ApiPropertyOptional({
    type: String,
    example: 'myschool.com',
    description: 'Current custom domain (null if none)',
  })
  customDomain: string | null;

  @ApiProperty({
    type: Boolean,
    example: false,
    description: 'Whether the domain has passed DNS verification',
  })
  verified: boolean;

  @ApiPropertyOptional({
    type: String,
    example: '2026-07-03T12:00:00.000Z',
    description: 'When the domain was verified (null if not verified)',
  })
  verifiedAt: string | null;

  @ApiPropertyOptional({
    type: String,
    example: 'a1b2c3d4e5f6g7h8',
    description: 'The verification token to place in the TXT record',
  })
  verifyToken: string | null;

  @ApiPropertyOptional({
    type: String,
    example:
      'Add a TXT record for "_basma.myschool.com" with value "a1b2c3d4e5f6g7h8"',
    description: 'Human-readable DNS setup instructions',
  })
  dnsInstructions: string | null;
}
