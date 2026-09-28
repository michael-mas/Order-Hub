// @vitest-environment node
import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/** Upstream calls made by the route under test. */
let upstream: { url: string; init: RequestInit | undefined }[] = []
let answer: () => Response = () => Response.json({ ok: true })

beforeEach(() => {
  upstream = []
  answer = () => Response.json({ ok: true })
  vi.resetModules() // fresh rate-limit buckets for every test
  vi.stubEnv('HUB_URL', 'http://hub.internal')
  vi.stubEnv('HUB_API_TOKEN', 'hub-secret')
  vi.stubEnv('SIMULATOR_URL', 'http://simulator.internal')
  vi.stubEnv('SIMULATOR_CONTROL_TOKEN', 'control-secret')
  vi.stubGlobal(
    'fetch',
    vi.fn((url: URL | string, init?: RequestInit) => {
      upstream.push({ url: String(url), init })
      return Promise.resolve(answer())
    }),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const context = (path: string) => ({ params: Promise.resolve({ path: path.split('/') }) })
const hub = async () => (await import('@/app/api/hub/[...path]/route')).POST
const hubGet = async () => (await import('@/app/api/hub/[...path]/route')).GET
const post = (headers: Record<string, string> = {}, body?: string) =>
  new Request('http://demo.example/api/hub/x', {
    method: 'POST',
    headers: { host: 'demo.example', ...headers },
    ...(body === undefined ? {} : { body }),
  })

describe('hub relay', () => {
  it('forwards an allowed call with the service token, never the browser headers', async () => {
    const response = await (
      await hub()
    )(post({ 'sec-fetch-site': 'same-origin', cookie: 'a=b' }), context('api/channels/atlas/pause'))
    expect(response.status).toBe(200)
    expect(upstream).toHaveLength(1)
    expect(upstream[0]?.url).toBe('http://hub.internal/api/channels/atlas/pause')
    const headers = new Headers(upstream[0]?.init?.headers)
    expect(headers.get('authorization')).toBe('Bearer hub-secret')
    expect(headers.get('cookie')).toBeNull()
  })

  it('keeps the query string and relays the upstream status', async () => {
    answer = () => Response.json({ error: 'no' }, { status: 422 })
    const request = new Request('http://demo.example/api/hub/api/journal?limit=5&after=9')
    const response = await (await hubGet())(request, context('api/journal'))
    expect(response.status).toBe(422)
    expect(upstream[0]?.url).toBe('http://hub.internal/api/journal?limit=5&after=9')
  })

  it('answers 404 outside the allowlist without calling upstream', async () => {
    const response = await (await hub())(post(), context('webhooks/nova'))
    expect(response.status).toBe(404)
    expect(upstream).toEqual([])
  })

  it('refuses cross-site writes and oversized bodies without calling upstream', async () => {
    const route = await hub()
    expect(
      (await route(post({ 'sec-fetch-site': 'cross-site' }), context('api/failed-messages/replay')))
        .status,
    ).toBe(403)
    expect(
      (await route(post({}, 'x'.repeat(20_000)), context('api/failed-messages/replay'))).status,
    ).toBe(413)
    expect(upstream).toEqual([])
  })

  it('rate-limits analyses, with Retry-After', async () => {
    const route = await hub()
    expect((await route(post(), context('api/incident-analyses'))).status).toBe(200)
    const limited = await route(post(), context('api/incident-analyses'))
    expect(limited.status).toBe(429)
    expect(Number(limited.headers.get('retry-after'))).toBeGreaterThan(0)
    expect(upstream).toHaveLength(1)
  })

  it('answers 502 when the hub is unreachable', async () => {
    answer = () => {
      throw new Error('ECONNREFUSED')
    }
    expect((await (await hub())(post(), context('api/failed-messages/replay'))).status).toBe(502)
  })
})

describe('simulator relay', () => {
  it('sends the control token and never exposes the ground truth', async () => {
    const { GET, PUT } = await import('@/app/api/simulator/[...path]/route')
    const put = new Request('http://demo.example/x', {
      method: 'PUT',
      headers: { host: 'demo.example' },
    })
    expect((await PUT(put, context('control/marketplaces/nova/preset/storm'))).status).toBe(200)
    expect(new Headers(upstream[0]?.init?.headers).get('x-control-token')).toBe('control-secret')
    const truth = await GET(
      new Request('http://demo.example/x'),
      context('control/marketplaces/nova/orders'),
    )
    expect(truth.status).toBe(404)
    expect(upstream).toHaveLength(1)
  })
})

describe('consistency check', () => {
  const truth = { orders: [{ order: { id: 'N-1', version: 2 }, acknowledgedRef: 'u1' }] }
  const rows = (n: number) =>
    Array.from({ length: n }, (_, i) => ({
      id: `u${i + 1}`,
      channel: 'nova',
      externalId: `N-${i + 1}`,
      version: 2,
    }))

  it('compares the ground truth with every order of the hub', async () => {
    answer = () => Response.json({})
    vi.stubGlobal(
      'fetch',
      vi.fn((url: URL | string, init?: RequestInit) => {
        upstream.push({ url: String(url), init })
        const u = String(url)
        if (u.includes('/control/'))
          return Promise.resolve(Response.json(u.includes('nova') ? truth : { orders: [] }))
        return Promise.resolve(Response.json(rows(1)))
      }),
    )
    const { GET } = await import('@/app/api/consistency/route')
    const report = (await (await GET()).json()) as { consistent: boolean; expected: number }
    expect(report).toMatchObject({ consistent: true, expected: 1 })
    const hubCall = upstream.find((c) => c.url.startsWith('http://hub.internal'))
    expect(new Headers(hubCall?.init?.headers).get('authorization')).toBe('Bearer hub-secret')
  })

  it('gives no verdict rather than a wrong one when the hub holds too many orders', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: URL | string) =>
        Promise.resolve(
          Response.json(String(url).includes('/control/') ? { orders: [] } : rows(100)),
        ),
      ),
    )
    const { GET } = await import('@/app/api/consistency/route')
    const response = await GET()
    expect(response.status).toBe(422)
    expect(((await response.json()) as { error: string }).error).toMatch(/too many to verify/)
  })

  it('is rate-limited', async () => {
    answer = () => Response.json({ orders: [] })
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(Response.json([]))),
    )
    const { GET } = await import('@/app/api/consistency/route')
    const statuses: number[] = []
    for (let i = 0; i < 4; i += 1) statuses.push((await GET()).status)
    expect(statuses.slice(0, 3).every((s) => s !== 429)).toBe(true)
    expect(statuses[3]).toBe(429)
  })
})

describe('health', () => {
  it('is healthy only when both services answer', async () => {
    const { GET } = await import('@/app/api/health/route')
    expect((await GET()).status).toBe(200)
    answer = () => new Response('down', { status: 503 })
    const degraded = await GET()
    expect(degraded.status).toBe(503)
    expect(await degraded.json()).toEqual({ status: 'degraded', hub: false, simulator: false })
  })
})

describe('page proxy', () => {
  it('stamps a fresh nonce-based policy on the request and the response', async () => {
    const { proxy } = await import('@/proxy')
    const first = proxy(new NextRequest('http://demo.example/'))
    const second = proxy(new NextRequest('http://demo.example/'))
    const policy = first.headers.get('content-security-policy') ?? ''
    expect(policy).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/)
    expect(first.headers.get('x-middleware-request-content-security-policy')).toBe(policy)
    expect(second.headers.get('content-security-policy')).not.toBe(policy)
  })
})
