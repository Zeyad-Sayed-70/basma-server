import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymobConfigResponseDto {
  @ApiProperty({ description: 'Configuration record ID' })
  id: string;

  @ApiProperty({ description: 'Whether Paymob has been fully configured and is ready to accept payments' })
  isConfigured: boolean;

  @ApiProperty({
    description: 'Secret Key (masked) — only first 4 and last 4 characters are shown for security',
    example: 'sk_t****xxxx',
  })
  secretKey: string;

  @ApiProperty({
    description: 'Public Key (masked) — only first 4 and last 4 characters are shown for security',
    example: 'pk_t****xxxx',
  })
  publicKey: string;

  @ApiPropertyOptional({
    description: 'Card Integration ID — numeric ID for card payment processing',
    example: 158,
    nullable: true,
  })
  cardIntegrationId: number | null;

  @ApiPropertyOptional({
    description: 'Wallet/Mobile Integration ID — numeric ID for wallet payment processing',
    example: 475,
    nullable: true,
  })
  walletIntegrationId: number | null;

  @ApiProperty({
    description: 'Operation mode',
    enum: ['test', 'live'],
    example: 'test',
  })
  mode: string;

  @ApiProperty({ description: 'Configuration creation timestamp', example: '2026-06-25T20:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ description: 'Configuration last update timestamp', example: '2026-06-25T20:00:00.000Z' })
  updatedAt: string;
}
