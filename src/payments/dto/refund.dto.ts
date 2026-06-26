import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, Min } from 'class-validator';

export class RefundDto {
  @ApiPropertyOptional({
    description:
      'Amount in cents to refund. Defaults to the full payment amount. Partial refunds are supported (set to less than the original amount).',
    example: 500,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;
}
