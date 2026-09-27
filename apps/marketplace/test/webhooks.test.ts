import { describe, expect, it } from 'vitest'
import { OrderStore } from '../src/orders.ts'
import { createRandom } from '../src/random.ts'
import { EVENT_ID_HEADER, SIGNATURE_HEADER, verify } from '../src/signature.ts'
import { WebhookEmitter, type WebhookEvent } from '../src/webhooks.ts'
import { manualTime, recordingDeliver } from './helpers.ts'

const noFaults = { dropRate: 0, duplicateRate: 0, maxDelayMs: 0 }

function setup(statuses: number[] = []) {
  const time = manualTime()
  const { deliver, calls } = recordingDeliver(statuses)
  const emitter = new WebhookEmitter(
    'nova',
    'secret',
    createRandom(1),
    deliver,
    time.schedule,
    time.now,
  )
  const store = new OrderStore('N', createRandom(2))
  return { time, calls, emitter, order: store.create(time.now(), 0).order }
}

describe('WebhookEmitter', () => {
  it('delivers a signed event the receiver can verify', async () => {
    const { time, calls, emitter, order } = setup()
    emitter.emit('http://hub/webhooks/nova', 'created', order, noFaults)
    await time.advance(0)

    expect(calls).toHaveLength(1)
    const call = calls[0]
    if (!call) throw new Error('no delivery')
    const event = JSON.parse(call.body) as WebhookEvent
    expect(event.type).toBe('order.created')
    expect(call.headers[EVENT_ID_HEADER]).toBe(event.event_id)
    expect(
      verify('secret', call.headers[SIGNATURE_HEADER] ?? '', call.body, time.now() / 1000),
    ).toBe(true)
    expect(emitter.stats.delivered).toBe(1)
  })

  it('does nothing for a polling-only channel', async () => {
    const { time, calls, emitter, order } = setup()
    emitter.emit(null, 'created', order, noFaults)
    await time.advance(10_000)
    expect(calls).toHaveLength(0)
    expect(emitter.stats.emitted).toBe(0)
  })

  it('drops and duplicates according to the configured faults', async () => {
    const { time, calls, emitter, order } = setup()
    emitter.emit('u', 'created', order, { dropRate: 1, duplicateRate: 0, maxDelayMs: 0 })
    emitter.emit('u', 'updated', order, { dropRate: 0, duplicateRate: 1, maxDelayMs: 0 })
    await time.advance(0)
    expect(emitter.stats).toMatchObject({ emitted: 2, dropped: 1, duplicated: 1, delivered: 2 })
    const ids = calls.map((c) => c.headers[EVENT_ID_HEADER])
    expect(ids[0]).toBe(ids[1])
  })

  it('retries rejected deliveries with exponential backoff, then gives up', async () => {
    const { time, calls, emitter, order } = setup([500, 500, 500, 500])
    emitter.emit('u', 'created', order, noFaults)
    await time.advance(0)
    expect(calls).toHaveLength(1)
    await time.advance(1_000)
    expect(calls).toHaveLength(2)
    await time.advance(2_000)
    expect(calls).toHaveLength(3)
    await time.advance(4_000)
    expect(calls).toHaveLength(4)
    await time.advance(60_000)
    expect(calls).toHaveLength(4)
    expect(emitter.stats).toMatchObject({ failedAttempts: 4, abandoned: 1, delivered: 0 })
  })

  it('recovers when a retry succeeds', async () => {
    const { time, emitter, order } = setup([503, 202])
    emitter.emit('u', 'created', order, noFaults)
    await time.advance(1_000)
    expect(emitter.stats).toMatchObject({ failedAttempts: 1, delivered: 1, abandoned: 0 })
  })
})
