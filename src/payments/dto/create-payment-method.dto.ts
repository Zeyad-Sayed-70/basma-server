import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  ValidateIf,
} from 'class-validator';
import { WalletType } from '@prisma/client';

export class CreatePaymentMethodDto {
  @ApiProperty({
    description: 'Payment method type',
    enum: ['WALLET', 'INSTAPAY'],
    example: 'WALLET',
  })
  @IsEnum(['WALLET', 'INSTAPAY'] as const)
  type: 'WALLET' | 'INSTAPAY';

  @ApiPropertyOptional({
    description: 'Wallet provider (required when type=WALLET)',
    enum: ['VODAFONE_CASH', 'ORANGE_CASH', 'ETISALAT_FLOUS', 'WE_PAY'],
    example: 'VODAFONE_CASH',
  })
  @ValidateIf((o) => o.type === 'WALLET')
  @IsEnum(WalletType)
  walletType?: WalletType;

  @ApiProperty({
    description: 'Name on the account',
    example: 'Ahmed Ali',
  })
  @IsString()
  accountName: string;

  @ApiProperty({
    description:
      'Account number (phone for wallets) or Instapay handle/phone',
    example: '01012341234',
  })
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({
    description: 'Whether this method is active',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
