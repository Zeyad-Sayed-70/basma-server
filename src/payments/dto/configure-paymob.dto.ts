import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsIn } from 'class-validator';

export class ConfigurePaymobDto {
  @ApiProperty({
    description:
      'Paymob Secret Key — found in Dashboard → Settings → Secret Key. Use sk_test_... for test mode, sk_live_... for live.',
    example: 'sk_test_626c1e1a6b8d4f9a2c3e5f7a8b0c1d2e3f4a5b6c',
  })
  @IsString()
  secretKey: string;

  @ApiProperty({
    description:
      'Paymob Public Key — found in Dashboard → Settings → Public Key. Use pk_test_... for test mode, pk_live_... for live.',
    example: 'pk_test_9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
  })
  @IsString()
  publicKey: string;

  @ApiProperty({
    description:
      'Paymob HMAC Secret — found in Dashboard → Settings → HMAC. Used to verify webhook signatures (SHA-512).',
    example: '6a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
  })
  @IsString()
  hmacSecret: string;

  @ApiProperty({
    description:
      'Card Integration ID — found in Developers → Payment Integrations → Card. The numeric ID for your card payment integration (e.g. Visa/Mastercard, 3D Secure).',
    example: 158,
  })
  @IsInt()
  cardIntegrationId: number;

  @ApiPropertyOptional({
    description:
      'Wallet/Mobile Integration ID — found in Developers → Payment Integrations → Wallet. The numeric ID for mobile wallet payments (e.g. Vodafone Cash, Orange Money). Optional — only needed if you accept wallet payments.',
    example: 475,
  })
  @IsOptional()
  @IsInt()
  walletIntegrationId?: number;

  @ApiPropertyOptional({
    description:
      'Operation mode — "test" for sandbox (test credentials), "live" for production (real money). Must match the key prefix (sk_test_ / sk_live_).',
    enum: ['test', 'live'],
    default: 'test',
    example: 'test',
  })
  @IsOptional()
  @IsIn(['test', 'live'])
  mode?: string;
}
