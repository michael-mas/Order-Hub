import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Webhook signature, in the shape most marketplaces and payment providers use:
 * `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<raw body>">`. The timestamp
 * is signed too, so a captured request cannot be replayed later.
 */
export const SIGNATURE_HEADER = 'x-marketplace-signature'
export const EVENT_ID_HEADER = 'x-marketplace-event-id'

export function sign(secret: string, timestampSeconds: number, rawBody: string): string {
  const digest = createHmac('sha256', secret).update(`${timestampSeconds}.${rawBody}`).digest('hex')
  return `t=${timestampSeconds},v1=${digest}`
}

export function verify(
  secret: string,
  header: string,
  rawBody: string,
  nowSeconds: number,
  toleranceSeconds = 300,
): boolean {
  const parts = new Map(
    header.split(',').map((part) => {
      const [key = '', value = ''] = part.split('=', 2)
      return [key.trim(), value.trim()] as const
    }),
  )
  const timestamp = Number(parts.get('t'))
  const received = parts.get('v1') ?? ''
  if (!Number.isInteger(timestamp) || Math.abs(nowSeconds - timestamp) > toleranceSeconds) {
    return false
  }
  const expected = sign(secret, timestamp, rawBody).split('v1=')[1] ?? ''
  const a = Buffer.from(expected, 'hex')
  const b = Buffer.from(received, 'hex')
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b)
}
