import type { Order } from './orders.ts'
import type { Random } from './random.ts'
import { EVENT_ID_HEADER, SIGNATURE_HEADER, sign } from './signature.ts'

export interface WebhookEvent {
  event_id: string
  type: 'order.created' | 'order.updated'
  occurred_at: string
  marketplace: string
  order: Order
}

export interface WebhookFaults {
  dropRate: number
  duplicateRate: number
  maxDelayMs: number
}

export interface WebhookStats {
  emitted: number
  dropped: number
  duplicated: number
  delivered: number
  failedAttempts: number
  abandoned: number
}

/** Transport, injectable so tests never open a socket. Returns the HTTP status. */
export type Deliver = (
  url: string,
  headers: Record<string, string>,
  body: string,
) => Promise<number>
export type Schedule = (task: () => void, delayMs: number) => void

export const fetchDeliver: Deliver = async (url, headers, body) => {
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(5_000),
  })
  return response.status
}

const MAX_ATTEMPTS = 4
const RETRY_BASE_MS = 1_000

/**
 * Delivers change notifications the way a real marketplace does on a bad day:
 * some never arrive, some arrive twice, and delays shuffle their order. A
 * delivery the receiver rejects is retried with exponential backoff.
 */
export class WebhookEmitter {
  readonly stats: WebhookStats = {
    emitted: 0,
    dropped: 0,
    duplicated: 0,
    delivered: 0,
    failedAttempts: 0,
    abandoned: 0,
  }
  private sequence = 0

  constructor(
    private readonly marketplace: string,
    private readonly secret: string,
    private readonly random: Random,
    private readonly deliver: Deliver,
    private readonly schedule: Schedule,
    private readonly now: () => number,
  ) {}

  emit(
    target: string | null,
    kind: 'created' | 'updated',
    order: Order,
    faults: WebhookFaults,
  ): void {
    if (target === null) return
    this.sequence += 1
    this.stats.emitted += 1
    const event: WebhookEvent = {
      event_id: `evt_${this.marketplace}_${String(this.sequence).padStart(8, '0')}`,
      type: kind === 'created' ? 'order.created' : 'order.updated',
      occurred_at: new Date(this.now()).toISOString(),
      marketplace: this.marketplace,
      order,
    }
    if (this.random.chance(faults.dropRate)) {
      this.stats.dropped += 1
      return
    }
    const copies = this.random.chance(faults.duplicateRate) ? 2 : 1
    if (copies === 2) this.stats.duplicated += 1
    for (let i = 0; i < copies; i += 1) {
      this.schedule(
        () => void this.attempt(target, event, 1),
        this.random.int(0, faults.maxDelayMs),
      )
    }
  }

  private async attempt(target: string, event: WebhookEvent, attempt: number): Promise<void> {
    const body = JSON.stringify(event)
    const headers = {
      'content-type': 'application/json',
      [EVENT_ID_HEADER]: event.event_id,
      [SIGNATURE_HEADER]: sign(this.secret, Math.floor(this.now() / 1000), body),
    }
    let ok: boolean
    try {
      const status = await this.deliver(target, headers, body)
      ok = status >= 200 && status < 300
    } catch {
      ok = false
    }
    if (ok) {
      this.stats.delivered += 1
      return
    }
    this.stats.failedAttempts += 1
    if (attempt >= MAX_ATTEMPTS) {
      this.stats.abandoned += 1
      return
    }
    this.schedule(
      () => void this.attempt(target, event, attempt + 1),
      RETRY_BASE_MS * 2 ** (attempt - 1),
    )
  }
}
