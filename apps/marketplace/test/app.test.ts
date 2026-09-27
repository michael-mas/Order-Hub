import { describe, expect, it } from 'vitest'
import { createWorld, type WorldConfig } from '../src/world.ts'
import { manualTime, recordingDeliver } from './helpers.ts'

const config: WorldConfig = {
  seed: 1234,
  hubUrl: 'http://hub.test/',
  controlToken: null,
  maxOrders: 500,
  secrets: { novaApiKey: 'nova-key', novaWebhookSecret: 'whsec', atlasApiKey: 'atlas-key' },
}

function setup(overrides: Partial<WorldConfig> = {}) {
  const time = manualTime()
  const { deliver, calls } = recordingDeliver()
  const world = createWorld(
    { ...config, ...overrides },
    { now: time.now, schedule: time.schedule, deliver, sleep: () => Promise.resolve() },
  )
  const call = (path: string, init: RequestInit = {}) => world.app.request(path, init)
  const nova = (path: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers)
    headers.set('authorization', 'Bearer nova-key')
    return call(`/v1/nova${path}`, { ...init, headers })
  }
  const json = { 'content-type': 'application/json' }
  return { time, calls, world, call, nova, json }
}

const since = '2026-01-01T00:00:00Z'

describe('public API', () => {
  it('requires the marketplace API key', async () => {
    const { call } = setup()
    expect((await call(`/v1/nova/orders?updated_since=${since}`)).status).toBe(401)
    const wrong = await call(`/v1/nova/orders?updated_since=${since}`, {
      headers: { authorization: 'Bearer atlas-key' },
    })
    expect(wrong.status).toBe(401)
  })

  it('pages through orders with an opaque token', async () => {
    const { world, nova } = setup()
    world.marketplaces.get('nova')?.generate(7, 0)

    const ids: string[] = []
    let token: string | null = null
    do {
      const query: string = token ? `&page_token=${token}` : ''
      const response = await nova(`/orders?updated_since=${since}&limit=3${query}`)
      expect(response.status).toBe(200)
      const body = (await response.json()) as {
        orders: { id: string }[]
        next_page_token: string | null
      }
      ids.push(...body.orders.map((o) => o.id))
      token = body.next_page_token
    } while (token)

    expect(ids).toEqual(
      Array.from({ length: 7 }, (_, i) => `NOVA-${String(i + 1).padStart(6, '0')}`),
    )
  })

  it('validates queries and page tokens', async () => {
    const { nova } = setup()
    expect((await nova('/orders')).status).toBe(400)
    expect((await nova(`/orders?updated_since=${since}&limit=1000`)).status).toBe(400)
    expect((await nova(`/orders?updated_since=${since}&page_token=nope`)).status).toBe(400)
  })

  it('enforces the plan quota with a usable Retry-After', async () => {
    const { world, nova, time } = setup()
    world.marketplaces.get('nova')?.configure({ rateLimit: { capacity: 2, refillPerSecond: 0.5 } })

    expect((await nova(`/orders?updated_since=${since}`)).status).toBe(200)
    expect((await nova(`/orders?updated_since=${since}`)).status).toBe(200)
    const throttled = await nova(`/orders?updated_since=${since}`)
    expect(throttled.status).toBe(429)
    const retryAfter = Number(throttled.headers.get('retry-after'))
    expect(retryAfter).toBe(2)

    await time.advance(retryAfter * 1000)
    expect((await nova(`/orders?updated_since=${since}`)).status).toBe(200)
    expect(world.marketplaces.get('nova')?.api.throttled).toBe(1)
  })

  it('injects server errors at the configured rate', async () => {
    const { world, nova } = setup()
    world.marketplaces.get('nova')?.configure({ errorRate: 1, rateLimit: { capacity: 100 } })
    const response = await nova(`/orders?updated_since=${since}`)
    expect(response.status).toBe(503)
    expect(world.marketplaces.get('nova')?.api.injectedErrors).toBe(1)
  })

  it('acknowledges an order idempotently', async () => {
    const { world, nova, json } = setup()
    world.marketplaces.get('nova')?.generate(1, 0)
    const ack = (ref: string) =>
      nova('/orders/NOVA-000001/acknowledgements', {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ merchant_order_ref: ref }),
      })
    expect((await ack('hub-1')).status).toBe(201)
    expect((await ack('hub-1')).status).toBe(200)
    expect((await ack('hub-2')).status).toBe(409)
    expect((await nova('/orders/NOVA-999999')).status).toBe(404)
  })

  it('notifies the hub through signed webhooks for webhook channels only', async () => {
    const { world, calls, time } = setup()
    world.marketplaces.get('nova')?.generate(2, 0)
    world.marketplaces.get('atlas')?.generate(2, 0)
    await time.advance(0)
    expect(calls.map((c) => c.url)).toEqual([
      'http://hub.test/webhooks/nova',
      'http://hub.test/webhooks/nova',
    ])
  })
})

describe('control plane', () => {
  it('patches chaos and rejects invalid values', async () => {
    const { call, json } = setup()
    const ok = await call('/control/marketplaces/nova/chaos', {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ errorRate: 0.2, webhooks: { duplicateRate: 0.5 } }),
    })
    expect(ok.status).toBe(200)
    expect(await ok.json()).toMatchObject({
      errorRate: 0.2,
      webhooks: { duplicateRate: 0.5, dropRate: 0 },
    })

    for (const body of [
      { errorRate: 2 },
      { latencyMs: { min: 500, max: 10 } },
      { unknown: true },
    ]) {
      const bad = await call('/control/marketplaces/nova/chaos', {
        method: 'PATCH',
        headers: json,
        body: JSON.stringify(body),
      })
      expect(bad.status).toBe(400)
    }
  })

  it('applies presets and exposes the ground truth', async () => {
    const { call, json } = setup()
    expect((await call('/control/marketplaces/atlas/preset/storm', { method: 'PUT' })).status).toBe(
      200,
    )
    expect((await call('/control/marketplaces/atlas/preset/nope', { method: 'PUT' })).status).toBe(
      404,
    )

    await call('/control/marketplaces/atlas/generate', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ orders: 3 }),
    })
    const truth = (await (await call('/control/marketplaces/atlas/orders')).json()) as {
      orders: unknown[]
    }
    expect(truth.orders).toHaveLength(3)
  })

  it('stops creating orders at the cap, and says so, while updates go on', async () => {
    const { call, world, json } = setup({ maxOrders: 5 })
    const response = await call('/control/marketplaces/atlas/generate', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ orders: 8, updates: 2 }),
    })
    const body = (await response.json()) as {
      orders: number
      capacity: { max_orders: number; reached: boolean }
      generated: { created: number; updated: number }
    }
    expect(body.generated).toEqual({ created: 5, updated: 2 })
    expect(body.orders).toBe(5)
    expect(body.capacity).toEqual({ max_orders: 5, reached: true })

    const atlas = world.marketplaces.get('atlas')
    expect(atlas?.generate(3, 1)).toEqual({ created: 0, updated: 1 })
    atlas?.tick(60_000)
    expect(atlas?.store.size).toBe(5)
  })

  it('resets to the seeded initial state', async () => {
    const { call, world } = setup()
    world.marketplaces.get('nova')?.generate(5, 0)
    await call('/control/reset', { method: 'POST' })
    expect(world.marketplaces.get('nova')?.store.size).toBe(0)
  })

  it('is protected by a token when one is configured', async () => {
    const { call } = setup({ controlToken: 't0ken' })
    expect((await call('/control/marketplaces')).status).toBe(401)
    expect(
      (await call('/control/marketplaces', { headers: { 'x-control-token': 't0ken' } })).status,
    ).toBe(200)
  })

  it('replays the same orders from the same seed, whatever the faults', () => {
    const a = setup()
    const b = setup()
    b.world.marketplaces.get('nova')?.configure({ errorRate: 0.9, webhooks: { dropRate: 0.5 } })
    a.world.marketplaces.get('nova')?.generate(10, 10)
    b.world.marketplaces.get('nova')?.generate(10, 10)
    const snapshot = (w: typeof a) =>
      w.world.marketplaces
        .get('nova')
        ?.store.snapshot()
        .map((s) => s.order.lines)
    expect(snapshot(a)).toEqual(snapshot(b))
  })
})
