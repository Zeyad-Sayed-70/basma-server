import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BrandResponseDto {
  @ApiProperty({ example: 'clx...', description: 'Brand ID' })
  id: string;

  @ApiPropertyOptional({
    example: 'http://localhost:9000/basma-assets/abc123/logo.png',
    description: 'Logo URL',
  })
  logoUrl: string | null;

  @ApiProperty({ example: '#2563eb', description: 'Primary brand color' })
  primaryColor: string;

  @ApiProperty({ example: '#1e40af', description: 'Secondary brand color' })
  secondaryColor: string;

  @ApiProperty({ example: 'Cairo', description: 'Font family' })
  fontFamily: string;

  @ApiPropertyOptional({
    example: 'myschool.example.com',
    description: 'Custom domain',
  })
  customDomain: string | null;

  @ApiPropertyOptional({
    example: '2026-07-03T12:00:00.000Z',
    description:
      'When the custom domain was DNS-verified (null if not verified)',
  })
  customDomainVerifiedAt: string | null;

  @ApiPropertyOptional({
    example: 'a1b2c3d4e5f6g7h8',
    description:
      'Verification token to place in the TXT record "_basma.<domain>" (present right after PATCH, cleared after verification)',
  })
  customDomainVerifyToken: string | null;

  @ApiProperty({
    example: false,
    description: 'Whether white-label is enabled (removes Basma branding)',
  })
  whiteLabelEnabled: boolean;

  @ApiProperty({ example: 'clx...', description: 'Instance ID' })
  instanceId: string;

  @ApiProperty({
    example: '2026-06-25T10:00:00.000Z',
    description: 'Creation timestamp',
  })
  createdAt: string;

  @ApiProperty({
    example: '2026-06-25T10:00:00.000Z',
    description: 'Last update timestamp',
  })
  updatedAt: string;
}
