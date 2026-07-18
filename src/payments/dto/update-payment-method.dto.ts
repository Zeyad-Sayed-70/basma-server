import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { WalletType } from '@prisma/client';

export class UpdatePaymentMethodDto {
  @ApiPropertyOptional({
    description: 'Payment method type',
    enum: ['WALLET', 'INSTAPAY'],
  })
  @IsOptional()
  @IsEnum(['WALLET', 'INSTAPAY'] as const)
  type?: 'WALLET' | 'INSTAPAY';

  @ApiPropertyOptional({
    description: 'Wallet provider',
    enum: ['VODAFONE_CASH', 'ORANGE_CASH', 'ETISALAT_FLOUS', 'WE_PAY'],
  })
  @IsOptional()
  @IsEnum(WalletType)
  walletType?: WalletType;

  @ApiPropertyOptional({
    description: 'Name on the account',
    example: 'Ahmed Ali',
  })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({
    description: 'Account number or Instapay handle',
    example: '01012341234',
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({
    description: 'Whether this method is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
