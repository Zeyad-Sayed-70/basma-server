import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface CreateIntentionParams {
  amountCents: number;
  currency: string;
  paymentMethodIds: number[];
  specialReference: string;
  notificationUrl: string;
  redirectionUrl: string;
  billingData: {
    firstName: string;
    lastName?: string;
    email: string;
    phoneNumber: string;
    street?: string;
    city?: string;
    country?: string;
  };
  items: Array<{
    name: string;
    amount: number;
    quantity: number;
    description?: string;
  }>;
  extras?: Record<string, unknown>;
  expiration?: number;
}

interface RefundParams {
  transactionId: string;
  amountCents: number;
}

@Injectable()
export class PaymobService {
  private readonly logger = new Logger(PaymobService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl =
      this.configService.get<string>('PAYMOB_BASE_URL') ??
      'https://accept.paymob.com';
  }

  async createIntention(
    secretKey: string,
    params: CreateIntentionParams,
  ): Promise<{ id: string; intentionOrderId: string; clientSecret: string }> {
    const body: Record<string, unknown> = {
      amount: params.amountCents,
      currency: params.currency,
      payment_methods: params.paymentMethodIds,
      items: params.items,
      billing_data: {
        first_name: params.billingData.firstName,
        last_name: params.billingData.lastName ?? '',
        email: params.billingData.email,
        phone_number: params.billingData.phoneNumber,
        street: params.billingData.street ?? 'N/A',
        city: params.billingData.city ?? 'Cairo',
        country: params.billingData.country ?? 'EG',
        apartment: 'N/A',
        floor: 'N/A',
        building: 'N/A',
        state: 'N/A',
      },
      special_reference: params.specialReference,
      notification_url: params.notificationUrl,
      redirection_url: params.redirectionUrl,
      expiration: params.expiration ?? 3600,
    };

    if (params.extras) {
      body.extras = params.extras;
    }

    const res = await fetch(`${this.baseUrl}/v1/intention/`, {
      method: 'POST',
      headers: {
        Authorization: `Token ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorText = await res.text();
      this.logger.error(
        `Paymob createIntention failed (${res.status}): ${errorText}`,
      );
      throw new BadRequestException(
        `Payment provider error: ${res.statusText}`,
      );
    }

    const data = (await res.json()) as Record<string, unknown>;

    return {
      id: String(data.id ?? ''),
      intentionOrderId: String(data.intention_order_id ?? ''),
      clientSecret: String(data.client_secret ?? ''),
    };
  }

  async refund(
    secretKey: string,
    params: RefundParams,
  ): Promise<Record<string, unknown>> {
    const res = await fetch(
      `${this.baseUrl}/api/acceptance/void_refund/refund`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: params.transactionId,
          amount_cents: String(params.amountCents),
        }),
      },
    );

    if (!res.ok) {
      const errorText = await res.text();
      this.logger.error(`Paymob refund failed (${res.status}): ${errorText}`);
      throw new BadRequestException(`Refund failed: ${res.statusText}`);
    }

    return res.json() as Promise<Record<string, unknown>>;
  }
}
