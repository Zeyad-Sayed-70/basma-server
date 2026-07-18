import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType, WalletType } from '@prisma/client';

export class PaymentMethodResponseDto {
  @ApiProperty({ description: 'Payment method ID' })
  id: string;

  @ApiProperty({
    description: 'Payment method type',
    enum: ['PAYMOB', 'WALLET', 'INSTAPAY'],
  })
  type: PaymentMethodType;

  @ApiPropertyOptional({
    description: 'Wallet provider',
    enum: ['VODAFONE_CASH', 'ORANGE_CASH', 'ETISALAT_FLOUS', 'WE_PAY'],
  })
  walletType?: WalletType;

  @ApiProperty({ description: 'Name on the account' })
  accountName: string;

  @ApiProperty({
    description:
      'Account number (masked in student list, full after initiation)',
  })
  accountNumber: string;

  @ApiProperty({ description: 'Whether this method is active' })
  isActive: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: string;
}

export class PaymentMethodListResponseDto {
  @ApiProperty({
    description: 'Array of payment methods',
    type: [PaymentMethodResponseDto],
  })
  data: PaymentMethodResponseDto[];
}
