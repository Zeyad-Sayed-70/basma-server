import { createHmac, timingSafeEqual } from 'crypto';

const HMAC_KEYS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
];

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((o: unknown, k: string) => {
    if (o == null || typeof o !== 'object') return undefined;
    return (o as Record<string, unknown>)[k];
  }, obj as unknown);
}

export function computeHmac(
  payload: Record<string, unknown>,
  hmacSecret: string,
): string {
  const concat = HMAC_KEYS.map((k) =>
    String(getNestedValue(payload, k) ?? ''),
  ).join('');

  return createHmac('sha512', hmacSecret).update(concat).digest('hex');
}

export function verifyHmac(
  payload: Record<string, unknown>,
  receivedHmac: string,
  hmacSecret: string,
): boolean {
  try {
    const computed = computeHmac(payload, hmacSecret);
    return timingSafeEqual(Buffer.from(computed), Buffer.from(receivedHmac));
  } catch {
    return false;
  }
}
