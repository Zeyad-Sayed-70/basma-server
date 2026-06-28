import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PaymentStudentDto {
  @ApiProperty({ description: 'Student ID' })
  id: string;

  @ApiProperty({ description: 'Student name' })
  name: string;

  @ApiPropertyOptional({ description: 'Student email', nullable: true })
  email: string | null;
}

class PaymentCourseDto {
  @ApiProperty({ description: 'Course ID' })
  id: string;

  @ApiProperty({ description: 'Course title' })
  title: string;
}

export class PaymentResponseDto {
  @ApiProperty({ description: 'Payment record ID' })
  id: string;

  @ApiProperty({ description: 'Student ID who made the payment' })
  studentId: string;

  @ApiPropertyOptional({
    description: 'Student details (included in single payment view)',
    type: PaymentStudentDto,
  })
  student?: PaymentStudentDto;

  @ApiPropertyOptional({ description: 'Course ID this payment is for' })
  courseId?: string;

  @ApiPropertyOptional({
    description: 'Course details (included in single payment view)',
    type: PaymentCourseDto,
  })
  course?: PaymentCourseDto;

  @ApiProperty({
    description: 'Amount in cents (e.g. 2000 = 20.00 EGP)',
    example: 2000,
  })
  amountCents: number;

  @ApiProperty({
    description: 'Human-readable amount with currency',
    example: '20.00 EGP',
  })
  amountFormatted: string;

  @ApiProperty({ description: 'Currency code', example: 'EGP' })
  currency: string;

  @ApiProperty({
    description: 'Payment status',
    enum: [
      'PENDING',
      'PROCESSING',
      'PAID',
      'FAILED',
      'REFUNDED',
      'PARTIALLY_REFUNDED',
      'VOIDED',
    ],
    example: 'PAID',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Paymob intention ID — returned when creating the intention',
  })
  paymobIntentionId?: string;

  @ApiPropertyOptional({
    description:
      'Paymob order ID (= intention_order_id) — used to correlate webhooks to payments',
  })
  paymobOrderId?: string;

  @ApiPropertyOptional({
    description:
      'Paymob transaction ID — populated after successful payment via webhook',
  })
  paymobTransactionId?: string;

  @ApiPropertyOptional({
    description:
      'Client secret — used to launch Paymob Unified Checkout on the frontend',
  })
  clientSecret?: string;

  @ApiPropertyOptional({
    description:
      'Paymob Unified Checkout URL — redirect the student here to complete payment',
    example:
      'https://accept.paymob.com/unifiedcheckout/?publicKey=pk_test_...&clientSecret=egy_csk_test_...',
  })
  checkoutUrl?: string;

  @ApiPropertyOptional({ description: 'Optional notes about the payment' })
  notes?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata stored with the payment',
    example: { source: 'mobile_app', discount_code: 'WELCOME10' },
  })
  metadata?: Record<string, unknown>;

  @ApiProperty({
    description: 'Payment creation timestamp',
    example: '2026-06-25T20:00:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: 'Payment last update timestamp',
    example: '2026-06-25T20:00:00.000Z',
  })
  updatedAt: string;
}

export class PaymentListResponseDto {
  @ApiProperty({
    description: 'Array of payment records',
    type: [PaymentResponseDto],
  })
  data: PaymentResponseDto[];

  @ApiProperty({
    description:
      'Total number of payments matching the filter (not just the current page)',
    example: 42,
  })
  total: number;
}

export class PaymentStatsResponseDto {
  @ApiProperty({
    description: 'Number of successfully paid payments',
    example: 15,
  })
  totalPaid: number;

  @ApiProperty({
    description: 'Number of payments in PENDING or PROCESSING state',
    example: 3,
  })
  totalPending: number;

  @ApiProperty({
    description: 'Number of refunded or partially refunded payments',
    example: 1,
  })
  totalRefunded: number;

  @ApiProperty({
    description: 'Sum of all paid amounts in cents',
    example: 300000,
  })
  revenueCents: number;

  @ApiProperty({
    description: 'Human-readable total revenue',
    example: '3000.00 EGP',
  })
  revenueFormatted: string;
}

export class StudentPaymentInitiationResponseDto {
  @ApiProperty({ description: 'Payment record ID' })
  id: string;

  @ApiProperty({ description: 'Amount in cents', example: 2000 })
  amountCents: number;

  @ApiProperty({ description: 'Human-readable amount', example: '20.00 EGP' })
  amountFormatted: string;

  @ApiProperty({ description: 'Currency', example: 'EGP' })
  currency: string;

  @ApiProperty({
    description:
      'Payment status — will be PROCESSING once intention is created',
    example: 'PROCESSING',
  })
  status: string;

  @ApiProperty({
    description: 'Client secret — pass this to Paymob Unified Checkout',
  })
  clientSecret: string;

  @ApiProperty({
    description:
      'Full Unified Checkout URL — redirect the student to this URL to complete payment',
  })
  checkoutUrl: string;

  @ApiProperty({
    description: 'Payment creation timestamp',
    example: '2026-06-25T20:00:00.000Z',
  })
  createdAt: string;
}

export class PaymobConfigStatusDto {
  @ApiProperty({ description: 'Whether Paymob is configured', example: false })
  isConfigured: boolean;
}

export class PaymobMessageDto {
  @ApiProperty({
    description: 'Human-readable status message',
    example: 'Paymob configuration removed',
  })
  message: string;
}

export class WebhookResponseDto {
  @ApiProperty({
    description: 'Whether the webhook was received and processed',
    example: true,
  })
  received: boolean;
}
