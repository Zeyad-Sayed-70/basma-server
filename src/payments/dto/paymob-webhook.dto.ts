import { ApiPropertyOptional } from '@nestjs/swagger';

class SourceDataDto {
  @ApiPropertyOptional({ description: 'Card PAN (last 4 digits)' })
  pan?: string;

  @ApiPropertyOptional({ description: 'Card sub type (e.g. Gold, Classic)' })
  sub_type?: string;

  @ApiPropertyOptional({ description: 'Source type (e.g. card, wallet)' })
  type?: string;
}

class OrderDto {
  @ApiPropertyOptional({ description: 'Paymob order ID (= intention_order_id)' })
  id?: string;
}

class ObjDto {
  @ApiPropertyOptional({ description: 'Transaction ID' })
  id?: string;

  @ApiPropertyOptional({ type: OrderDto })
  order?: OrderDto;
}

export class PaymobWebhookDto {
  @ApiPropertyOptional({ description: 'Paymob transaction ID' })
  id?: string;

  @ApiPropertyOptional({
    description: 'Transaction success status — this is the authoritative field (true/false)',
    oneOf: [{ type: 'boolean' }, { type: 'string' }],
  })
  success?: string | boolean;

  @ApiPropertyOptional({ description: 'Transaction amount in cents' })
  amount_cents?: number;

  @ApiPropertyOptional({ description: 'Transaction creation timestamp' })
  created_at?: string;

  @ApiPropertyOptional({ description: 'Transaction currency (e.g. EGP)' })
  currency?: string;

  @ApiPropertyOptional({ description: 'Whether an error occurred (Paymob spelling: one r)' })
  error_occured?: string;

  @ApiPropertyOptional({ description: 'Whether this transaction has a parent (e.g. refund)' })
  has_parent_transaction?: string;

  @ApiPropertyOptional({ description: 'Integration ID used for this transaction' })
  integration_id?: string;

  @ApiPropertyOptional({ description: 'Whether 3D Secure was used' })
  is_3d_secure?: string;

  @ApiPropertyOptional({ description: 'Whether this is an Auth transaction' })
  is_auth?: string;

  @ApiPropertyOptional({ description: 'Whether this is a Capture transaction' })
  is_capture?: string;

  @ApiPropertyOptional({ description: 'Whether this transaction is refunded' })
  is_refunded?: string;

  @ApiPropertyOptional({ description: 'Whether this is a standalone payment' })
  is_standalone_payment?: string;

  @ApiPropertyOptional({ description: 'Whether this transaction is voided' })
  is_voided?: string;

  @ApiPropertyOptional({ description: 'Whether this is a refund transaction' })
  is_refund?: string;

  @ApiPropertyOptional({ description: 'Merchant ID that owns this transaction' })
  owner?: string;

  @ApiPropertyOptional({ description: 'Whether the transaction is pending' })
  pending?: string;

  @ApiPropertyOptional({ type: SourceDataDto })
  source_data?: SourceDataDto;

  @ApiPropertyOptional({ type: ObjDto, description: 'Top-level object containing transaction + order info' })
  obj?: ObjDto;

  @ApiPropertyOptional({ description: 'Order info (used in GET callbacks)' })
  order?: OrderDto;

  @ApiPropertyOptional({ description: 'Order ID (used in GET callbacks — alternative to obj.order.id)' })
  order_id?: string;

  @ApiPropertyOptional({ description: 'The special_reference / merchant order ID you set when creating the intention' })
  merchant_order_id?: string;

  @ApiPropertyOptional({ description: 'HMAC signature — must be verified against your HMAC secret' })
  hmac?: string;
}
