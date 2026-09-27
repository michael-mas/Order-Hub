import type { Random } from './random.ts'

export const ORDER_STATUSES = ['new', 'accepted', 'shipped', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export interface OrderLine {
  sku: string
  title: string
  quantity: number
  unit_price_minor: number
}

/** Wire format, as the marketplace publishes it. Amounts in minor units. */
export interface Order {
  id: string
  status: OrderStatus
  currency: 'EUR'
  total_minor: number
  lines: OrderLine[]
  buyer: { display_name: string }
  created_at: string
  updated_at: string
  /** Increases on every change: the only safe way to order updates. */
  version: number
}

interface StoredOrder {
  order: Order
  updatedAtMs: number
  /** Eventual consistency: a change shows up in listings only from this instant. */
  visibleAtMs: number
  acknowledgedRef: string | null
}

export interface ListQuery {
  updatedSinceMs: number
  limit: number
  cursor: { updatedAtMs: number; id: string } | null
}

export interface ListPage {
  orders: Order[]
  next: { updatedAtMs: number; id: string } | null
}

const CATALOG = [
  { sku: 'MUG-CER-350', title: 'Ceramic mug 350 ml', price: 1490 },
  { sku: 'TEE-ORG-M', title: 'Organic cotton tee, M', price: 2490 },
  { sku: 'BAG-CAN-01', title: 'Canvas tote bag', price: 1990 },
  { sku: 'LMP-DSK-02', title: 'Desk lamp, brass', price: 7900 },
  { sku: 'NTB-A5-DOT', title: 'Dotted notebook A5', price: 990 },
  { sku: 'BTL-STL-75', title: 'Steel bottle 750 ml', price: 2890 },
] as const

/** Pseudonymous on purpose: the simulator never produces personal data. */
const BUYERS = ['Buyer 0412', 'Buyer 1187', 'Buyer 2290', 'Buyer 3051', 'Buyer 4478', 'Buyer 5903']

const NEXT_STATUS: Record<OrderStatus, OrderStatus[]> = {
  new: ['accepted', 'cancelled'],
  accepted: ['shipped', 'cancelled'],
  shipped: [],
  cancelled: [],
}

export type OrderChange = { kind: 'created' | 'updated'; order: Order }

export class OrderStore {
  private readonly orders = new Map<string, StoredOrder>()
  private sequence = 0

  constructor(
    private readonly prefix: string,
    private readonly random: Random,
  ) {}

  create(nowMs: number, visibilityDelayMs: number): OrderChange {
    this.sequence += 1
    const id = `${this.prefix}-${String(this.sequence).padStart(6, '0')}`
    const lines: OrderLine[] = Array.from({ length: this.random.int(1, 3) }, () => {
      const product = this.random.pick(CATALOG)
      return {
        sku: product.sku,
        title: product.title,
        quantity: this.random.int(1, 3),
        unit_price_minor: product.price,
      }
    })
    const iso = new Date(nowMs).toISOString()
    const order: Order = {
      id,
      status: 'new',
      currency: 'EUR',
      total_minor: lines.reduce((sum, line) => sum + line.quantity * line.unit_price_minor, 0),
      lines,
      buyer: { display_name: this.random.pick(BUYERS) },
      created_at: iso,
      updated_at: iso,
      version: 1,
    }
    this.orders.set(id, {
      order,
      updatedAtMs: nowMs,
      visibleAtMs: nowMs + visibilityDelayMs,
      acknowledgedRef: null,
    })
    return { kind: 'created', order: structuredClone(order) }
  }

  /** Moves one open order to its next status, if any order is still open. */
  advanceRandom(nowMs: number, visibilityDelayMs: number): OrderChange | null {
    const open = [...this.orders.values()].filter(
      (stored) => NEXT_STATUS[stored.order.status].length > 0,
    )
    if (open.length === 0) return null
    const stored = this.random.pick(open)
    const status = this.random.pick(NEXT_STATUS[stored.order.status])
    // Timestamps are strictly increasing per order even within the same millisecond.
    const updatedAtMs = Math.max(nowMs, stored.updatedAtMs + 1)
    stored.order = {
      ...stored.order,
      status,
      updated_at: new Date(updatedAtMs).toISOString(),
      version: stored.order.version + 1,
    }
    stored.updatedAtMs = updatedAtMs
    stored.visibleAtMs = updatedAtMs + visibilityDelayMs
    return { kind: 'updated', order: structuredClone(stored.order) }
  }

  get(id: string, nowMs: number): Order | null {
    const stored = this.orders.get(id)
    if (!stored || stored.visibleAtMs > nowMs) return null
    return structuredClone(stored.order)
  }

  /**
   * Keyset pagination on (updated_at, id), stable while orders keep changing.
   * Only changes already visible at `nowMs` are listed.
   */
  list(query: ListQuery, nowMs: number): ListPage {
    const visible = [...this.orders.values()]
      .filter((s) => s.visibleAtMs <= nowMs && s.updatedAtMs >= query.updatedSinceMs)
      .filter((s) => {
        const c = query.cursor
        if (!c) return true
        return (
          s.updatedAtMs > c.updatedAtMs || (s.updatedAtMs === c.updatedAtMs && s.order.id > c.id)
        )
      })
      .sort((a, b) => a.updatedAtMs - b.updatedAtMs || a.order.id.localeCompare(b.order.id))

    const page = visible.slice(0, query.limit)
    const last = page.at(-1)
    return {
      orders: page.map((s) => structuredClone(s.order)),
      next:
        visible.length > query.limit && last
          ? { updatedAtMs: last.updatedAtMs, id: last.order.id }
          : null,
    }
  }

  /** Idempotent: acknowledging twice with the same reference is a no-op. */
  acknowledge(
    id: string,
    merchantRef: string,
  ): 'acknowledged' | 'already' | 'conflict' | 'unknown' {
    const stored = this.orders.get(id)
    if (!stored) return 'unknown'
    if (stored.acknowledgedRef === merchantRef) return 'already'
    if (stored.acknowledgedRef !== null) return 'conflict'
    stored.acknowledgedRef = merchantRef
    return 'acknowledged'
  }

  /** Ground truth for tests and for the "exactly once" check. */
  snapshot(): { order: Order; acknowledgedRef: string | null }[] {
    return [...this.orders.values()]
      .map((s) => ({ order: structuredClone(s.order), acknowledgedRef: s.acknowledgedRef }))
      .sort((a, b) => a.order.id.localeCompare(b.order.id))
  }

  get size(): number {
    return this.orders.size
  }
}
