import { Hono, type Context, type Env } from 'hono'
import { z } from 'zod'
import { chaosPatchSchema, isPresetName, PRESETS } from './chaos.ts'
import type { Marketplace } from './marketplace.ts'

export interface AppOptions {
  marketplaces: Map<string, Marketplace>
  /** Wait before answering; injected so tests stay instantaneous. */
  sleep: (ms: number) => Promise<void>
  randomInt: (min: number, max: number) => number
  now: () => number
  /** When set, control routes require it in `x-control-token`. */
  controlToken: string | null
  reset: () => void
}

const MAX_PAGE = 100

const listQuerySchema = z.object({
  updated_since: z.iso.datetime({ offset: true }),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE).default(50),
  page_token: z.string().optional(),
})

const cursorSchema = z.object({ u: z.number().int(), i: z.string().min(1) })

const ackSchema = z.object({ merchant_order_ref: z.string().min(1).max(64) }).strict()

const generateSchema = z
  .object({ orders: z.number().int().min(0).max(500), updates: z.number().int().min(0).max(500) })
  .partial()
  .strict()

const encodeCursor = (c: { updatedAtMs: number; id: string }): string =>
  Buffer.from(JSON.stringify({ u: c.updatedAtMs, i: c.id })).toString('base64url')

function decodeCursor(token: string): { updatedAtMs: number; id: string } | null {
  try {
    const parsed = cursorSchema.parse(JSON.parse(Buffer.from(token, 'base64url').toString('utf8')))
    return { updatedAtMs: parsed.u, id: parsed.i }
  } catch {
    return null
  }
}

// Hono types a middleware's input as `any`; accepting it keeps call sites clean.
function problem<E extends Env, P extends string>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  c: Context<E, P, any>,
  status: 400 | 401 | 404 | 409 | 429 | 503,
  code: string,
  message: string,
) {
  return c.json({ error: { code, message } }, status)
}

export function createApp(options: AppOptions): Hono {
  const app = new Hono()

  app.get('/health', (c) => c.json({ status: 'ok' }))

  // ---------------------------------------------------------------- public API
  const api = new Hono<{ Variables: { marketplace: Marketplace } }>()

  api.use('/:code/*', async (c, next) => {
    const marketplace = options.marketplaces.get(c.req.param('code'))
    if (!marketplace) return problem(c, 404, 'unknown_marketplace', 'No such marketplace')
    marketplace.api.requests += 1

    if (c.req.header('authorization') !== `Bearer ${marketplace.definition.apiKey}`) {
      marketplace.api.unauthorized += 1
      return problem(c, 401, 'unauthorized', 'Missing or invalid API key')
    }

    const token = marketplace.takeToken()
    if (!token.allowed) {
      marketplace.api.throttled += 1
      const seconds = Number.isFinite(token.retryAfterMs)
        ? Math.ceil(token.retryAfterMs / 1000)
        : 3600
      c.header('retry-after', String(seconds))
      return problem(c, 429, 'rate_limited', 'Plan quota exceeded')
    }
    c.header('x-ratelimit-remaining', String(token.remaining))

    const { min, max } = marketplace.chaos.latencyMs
    await options.sleep(options.randomInt(min, max))

    if (options.randomInt(0, 9_999) < marketplace.chaos.errorRate * 10_000) {
      marketplace.api.injectedErrors += 1
      return problem(c, 503, 'unavailable', 'Upstream temporarily unavailable')
    }
    c.set('marketplace', marketplace)
    await next()
    marketplace.api.served += 1
  })

  api.get('/:code/orders', (c) => {
    const parsed = listQuerySchema.safeParse(c.req.query())
    if (!parsed.success) return problem(c, 400, 'invalid_query', z.prettifyError(parsed.error))
    const { updated_since, limit, page_token } = parsed.data
    const cursor = page_token === undefined ? null : decodeCursor(page_token)
    if (page_token !== undefined && cursor === null) {
      return problem(c, 400, 'invalid_page_token', 'Malformed page_token')
    }
    const page = c.var.marketplace.store.list(
      { updatedSinceMs: Date.parse(updated_since), limit, cursor },
      options.now(),
    )
    return c.json({
      orders: page.orders,
      next_page_token: page.next ? encodeCursor(page.next) : null,
    })
  })

  api.get('/:code/orders/:id', (c) => {
    const order = c.var.marketplace.store.get(c.req.param('id'), options.now())
    return order ? c.json(order) : problem(c, 404, 'order_not_found', 'No such order')
  })

  api.post('/:code/orders/:id/acknowledgements', async (c) => {
    const parsed = ackSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return problem(c, 400, 'invalid_body', z.prettifyError(parsed.error))
    const result = c.var.marketplace.store.acknowledge(
      c.req.param('id'),
      parsed.data.merchant_order_ref,
    )
    switch (result) {
      case 'unknown':
        return problem(c, 404, 'order_not_found', 'No such order')
      case 'conflict':
        return problem(c, 409, 'already_acknowledged', 'Acknowledged with another reference')
      default:
        c.var.marketplace.api.acknowledgements += result === 'acknowledged' ? 1 : 0
        return c.json({ status: result }, result === 'acknowledged' ? 201 : 200)
    }
  })

  app.route('/v1', api)

  // ------------------------------------------------------------ control plane
  const control = new Hono()

  control.use('*', async (c, next) => {
    if (options.controlToken !== null && c.req.header('x-control-token') !== options.controlToken) {
      return problem(c, 401, 'unauthorized', 'Invalid control token')
    }
    await next()
  })

  control.get('/marketplaces', (c) =>
    c.json({ marketplaces: [...options.marketplaces.values()].map((m) => m.status()) }),
  )

  const find = (c: Context): Marketplace | undefined =>
    options.marketplaces.get(c.req.param('code') ?? '')

  control.get('/marketplaces/:code', (c) => {
    const m = find(c)
    return m ? c.json(m.status()) : problem(c, 404, 'unknown_marketplace', 'No such marketplace')
  })

  control.patch('/marketplaces/:code/chaos', async (c) => {
    const m = find(c)
    if (!m) return problem(c, 404, 'unknown_marketplace', 'No such marketplace')
    const parsed = chaosPatchSchema.safeParse(await c.req.json().catch(() => null))
    if (!parsed.success) return problem(c, 400, 'invalid_chaos', z.prettifyError(parsed.error))
    try {
      return c.json(m.configure(parsed.data))
    } catch (error) {
      return problem(c, 400, 'invalid_chaos', error instanceof Error ? error.message : 'Invalid')
    }
  })

  control.put('/marketplaces/:code/preset/:name', (c) => {
    const m = find(c)
    const name = c.req.param('name')
    if (!m) return problem(c, 404, 'unknown_marketplace', 'No such marketplace')
    if (!isPresetName(name)) return problem(c, 404, 'unknown_preset', 'No such preset')
    return c.json(m.replaceChaos(structuredClone(PRESETS[name])))
  })

  control.post('/marketplaces/:code/generate', async (c) => {
    const m = find(c)
    if (!m) return problem(c, 404, 'unknown_marketplace', 'No such marketplace')
    const parsed = generateSchema.safeParse(await c.req.json().catch(() => ({})))
    if (!parsed.success) return problem(c, 400, 'invalid_body', z.prettifyError(parsed.error))
    m.generate(parsed.data.orders ?? 0, parsed.data.updates ?? 0)
    return c.json(m.status(), 202)
  })

  /** Ground truth: what the hub is expected to hold, for tests and the console. */
  control.get('/marketplaces/:code/orders', (c) => {
    const m = find(c)
    return m
      ? c.json({ orders: m.store.snapshot() })
      : problem(c, 404, 'unknown_marketplace', 'No such marketplace')
  })

  control.post('/reset', (c) => {
    options.reset()
    return c.json({ status: 'reset' })
  })

  app.route('/control', control)
  app.notFound((c) => problem(c, 404, 'not_found', 'No such route'))
  return app
}
