import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import { OrderStore } from '../src/orders.ts'
import { createRandom } from '../src/random.ts'

const T0 = Date.parse('2026-09-26T10:00:00Z')

function drain(store: OrderStore, sinceMs: number, limit: number, nowMs: number): string[] {
  const seen: string[] = []
  let cursor: { updatedAtMs: number; id: string } | null = null
  for (let guard = 0; guard < 10_000; guard += 1) {
    const page = store.list({ updatedSinceMs: sinceMs, limit, cursor }, nowMs)
    seen.push(...page.orders.map((o) => o.id))
    if (!page.next) return seen
    cursor = page.next
  }
  throw new Error('pagination did not terminate')
}

describe('OrderStore', () => {
  it('builds consistent orders', () => {
    const store = new OrderStore('TEST', createRandom(1))
    const { order } = store.create(T0, 0)
    expect(order.id).toBe('TEST-000001')
    expect(order.version).toBe(1)
    expect(order.total_minor).toBe(
      order.lines.reduce((sum, l) => sum + l.quantity * l.unit_price_minor, 0),
    )
  })

  it('lists every visible order exactly once, whatever the page size', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.nat(60),
        fc.nat(60),
        fc.integer({ min: 1, max: 25 }),
        (seed, creates, updates, limit) => {
          const store = new OrderStore('P', createRandom(seed))
          for (let i = 0; i < creates; i += 1) store.create(T0 + (i % 5), 0)
          for (let i = 0; i < updates; i += 1) store.advanceRandom(T0 + 10, 0)
          const ids = drain(store, 0, limit, T0 + 1_000)
          expect(new Set(ids).size).toBe(ids.length)
          expect(ids.length).toBe(store.size)
        },
      ),
    )
  })

  it('increases version and updated_at on every change', () => {
    const store = new OrderStore('V', createRandom(3))
    store.create(T0, 0)
    const before = store.get('V-000001', T0)
    const change = store.advanceRandom(T0, 0)
    expect(change?.order.version).toBe(2)
    expect(Date.parse(change?.order.updated_at ?? '')).toBeGreaterThan(
      Date.parse(before?.updated_at ?? ''),
    )
  })

  it('stops advancing once every order is final', () => {
    const store = new OrderStore('F', createRandom(5))
    store.create(T0, 0)
    let changes = 0
    while (store.advanceRandom(T0, 0)) changes += 1
    expect(changes).toBeGreaterThanOrEqual(1)
    expect(changes).toBeLessThanOrEqual(2)
    expect(['shipped', 'cancelled']).toContain(store.snapshot()[0]?.order.status)
  })

  it('hides a change until it becomes visible (eventual consistency)', () => {
    const store = new OrderStore('E', createRandom(9))
    store.create(T0, 5_000)
    expect(store.get('E-000001', T0 + 4_999)).toBeNull()
    expect(drain(store, 0, 10, T0 + 4_999)).toEqual([])
    // The order is listed under its real updated_at, which is in the past by
    // then: a poller that moves its window forward without overlap misses it.
    expect(drain(store, T0 + 1_000, 10, T0 + 5_000)).toEqual([])
    expect(drain(store, T0, 10, T0 + 5_000)).toEqual(['E-000001'])
  })

  it('acknowledges idempotently and detects conflicts', () => {
    const store = new OrderStore('A', createRandom(11))
    store.create(T0, 0)
    expect(store.acknowledge('A-000001', 'ref-1')).toBe('acknowledged')
    expect(store.acknowledge('A-000001', 'ref-1')).toBe('already')
    expect(store.acknowledge('A-000001', 'ref-2')).toBe('conflict')
    expect(store.acknowledge('A-999999', 'ref-1')).toBe('unknown')
  })
})
