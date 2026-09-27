import { describe, expect, it } from 'vitest'
import { compare } from '@/lib/consistency'
import { contentSecurityPolicy, createNonce } from '@/lib/csp'
import { isCrossSite, readLimited } from '@/lib/guard'
import type { JournalEntry } from '@/lib/hub'
import { mergeJournal } from '@/lib/journal'
import { createBucket, createLimiter, DEFAULT_LIMITS, limitsFromEnv } from '@/lib/limits'
import { HUB_ROUTES, isAllowed, match, SIMULATOR_ROUTES } from '@/lib/routes'

describe('proxy allowlist', () => {
  it.each([
    ['GET', 'api/journal'],
    ['GET', 'api/orders'],
    ['POST', 'api/channels/atlas/pause'],
    ['POST', 'api/failed-messages/42/replay'],
    ['POST', 'api/failed-messages/replay'],
    ['POST', 'api/incident-analyses'],
    ['POST', 'api/incident-analyses/actions'],
  ])('lets %s %s through', (method, path) => {
    expect(isAllowed(HUB_ROUTES, method, path.split('/'))).toBe(true)
  })

  it.each([
    ['DELETE', 'api/journal'],
    ['POST', 'api/journal'],
    ['GET', 'health'],
    ['GET', 'api/docs'],
    ['POST', 'api/channels/atlas/delete'],
    ['POST', 'api/channels/../pause'],
    ['GET', 'api/../_profiler'],
    ['POST', 'api/failed-messages/1;drop/replay'],
    ['POST', 'webhooks/nova'],
  ])('refuses %s %s', (method, path) => {
    expect(isAllowed(HUB_ROUTES, method, path.split('/'))).toBe(false)
  })

  it('refuses encoded separators hidden in one segment', () => {
    expect(isAllowed(HUB_ROUTES, 'GET', ['api', 'journal/../../health'])).toBe(false)
  })

  it('never exposes the simulator reset or its ground truth to the browser', () => {
    expect(isAllowed(SIMULATOR_ROUTES, 'POST', ['control', 'reset'])).toBe(false)
    expect(isAllowed(SIMULATOR_ROUTES, 'GET', 'control/marketplaces/nova/orders'.split('/'))).toBe(
      false,
    )
    expect(
      isAllowed(SIMULATOR_ROUTES, 'PUT', 'control/marketplaces/nova/preset/storm'.split('/')),
    ).toBe(true)
    expect(
      isAllowed(SIMULATOR_ROUTES, 'PUT', 'control/marketplaces/nova/preset/apocalypse'.split('/')),
    ).toBe(false)
  })
})

const entry = (id: number): JournalEntry => ({
  id: String(id),
  occurred_at: '2026-09-26T10:00:00Z',
  channel: 'nova',
  type: 'order.created',
  severity: 'info',
  message: `#${id}`,
  context: {},
})

describe('mergeJournal', () => {
  it('appends new entries in id order without duplicates', () => {
    const merged = mergeJournal([entry(1), entry(2)], [entry(2), entry(4), entry(3)])
    expect(merged.map((e) => e.id)).toEqual(['1', '2', '3', '4'])
  })

  it('keeps only the most recent entries beyond its capacity', () => {
    const merged = mergeJournal([entry(1), entry(2)], [entry(3)], 2)
    expect(merged.map((e) => e.id)).toEqual(['2', '3'])
  })

  it('orders numerically, not alphabetically', () => {
    expect(mergeJournal([entry(9)], [entry(10)]).map((e) => e.id)).toEqual(['9', '10'])
  })
})

describe('compare (exactly once)', () => {
  const truth = [
    { channel: 'nova', id: 'N-1', version: 2, acknowledgedRef: 'uuid-1' },
    { channel: 'nova', id: 'N-2', version: 1, acknowledgedRef: null },
    { channel: 'atlas', id: 'A-1', version: 3, acknowledgedRef: 'someone-else' },
    { channel: 'atlas', id: 'A-2', version: 1, acknowledgedRef: null },
  ]

  it('reports every kind of divergence', () => {
    const result = compare(truth, [
      { channel: 'nova', externalId: 'N-1', version: 2, id: 'uuid-1' },
      { channel: 'nova', externalId: 'N-2', version: 1, id: 'uuid-2' },
      { channel: 'atlas', externalId: 'A-1', version: 2, id: 'uuid-3' },
      { channel: 'atlas', externalId: 'GHOST', version: 1, id: 'uuid-4' },
    ])
    expect(result).toMatchObject({
      expected: 4,
      stored: 4,
      missing: ['atlas/A-2'],
      behind: ['atlas/A-1'],
      unacknowledged: ['nova/N-2'],
      wrongReference: ['atlas/A-1'],
      unexpected: ['atlas/GHOST'],
      consistent: false,
    })
  })

  it('is consistent when every order is stored once, current and acknowledged by the hub', () => {
    const result = compare(
      [{ channel: 'nova', id: 'N-1', version: 2, acknowledgedRef: 'uuid-1' }],
      [{ channel: 'nova', externalId: 'N-1', version: 2, id: 'uuid-1' }],
    )
    expect(result.consistent).toBe(true)
  })

  it('counts an order read twice (an unstable pagination) once', () => {
    const order = { channel: 'nova', externalId: 'N-1', version: 1, id: 'u1' }
    const result = compare(
      [{ channel: 'nova', id: 'N-1', version: 1, acknowledgedRef: 'u1' }],
      [order, order],
    )
    expect(result.stored).toBe(1)
    expect(result.consistent).toBe(true)
  })

  it('does not confuse the same id on two channels', () => {
    const result = compare(
      [{ channel: 'nova', id: 'X', version: 1, acknowledgedRef: 'u1' }],
      [{ channel: 'atlas', externalId: 'X', version: 1, id: 'u1' }],
    )
    expect(result.missing).toEqual(['nova/X'])
    expect(result.unexpected).toEqual(['atlas/X'])
  })
})

describe('rate limits', () => {
  it('lets a burst through, then refills one token per interval', () => {
    let now = 0
    const bucket = createBucket({ capacity: 2, refillMs: 1000 }, () => now)
    expect(bucket.take()).toBe(0)
    expect(bucket.take()).toBe(0)
    expect(bucket.take()).toBe(1000)
    now = 400
    expect(bucket.take()).toBe(600)
    now = 1000
    expect(bucket.take()).toBe(0)
    now = 60_000
    expect(bucket.take()).toBe(0)
    expect(bucket.take()).toBe(0)
    expect(bucket.take()).toBeGreaterThan(0)
  })

  it('keeps one bucket per limit', () => {
    const limiter = createLimiter(DEFAULT_LIMITS, () => 0)
    expect(limiter.take('analysis')).toBe(0)
    expect(limiter.take('analysis')).toBe(15_000)
    expect(limiter.take('operation')).toBe(0)
  })

  it('bounds every write the console relays', () => {
    const writes = [...HUB_ROUTES, ...SIMULATOR_ROUTES].filter((rule) => rule.method !== 'GET')
    expect(writes.length).toBeGreaterThan(0)
    for (const rule of writes) expect(rule.limit, String(rule.path)).toBeDefined()
    expect(match(HUB_ROUTES, 'POST', 'api/incident-analyses'.split('/'))?.limit).toBe('analysis')
    expect(
      match(SIMULATOR_ROUTES, 'POST', 'control/marketplaces/nova/generate'.split('/'))?.limit,
    ).toBe('generate')
  })

  it('reads the analysis interval from the environment, and nothing else', () => {
    expect(limitsFromEnv({ ANALYSIS_COOLDOWN_MS: '0' }).analysis.refillMs).toBe(0)
    expect(limitsFromEnv({ ANALYSIS_COOLDOWN_MS: 'soon' }).analysis).toEqual(
      DEFAULT_LIMITS.analysis,
    )
    expect(limitsFromEnv({})).toEqual(DEFAULT_LIMITS)
    const unlimited = createBucket({ capacity: 1, refillMs: 0 })
    expect([unlimited.take(), unlimited.take()]).toEqual([0, 0])
  })
})

const write = (headers: Record<string, string>, body?: string): Request =>
  new Request('http://demo.example/api/hub/api/failed-messages/replay', {
    method: 'POST',
    headers: { host: 'demo.example', ...headers },
    ...(body === undefined ? {} : { body }),
  })

describe('write guard', () => {
  it('accepts same-origin writes and clients without browser headers', () => {
    expect(isCrossSite(write({ 'sec-fetch-site': 'same-origin' }))).toBe(false)
    expect(isCrossSite(write({ origin: 'http://demo.example' }))).toBe(false)
    expect(isCrossSite(write({}))).toBe(false)
  })

  it('refuses writes another site makes the browser send', () => {
    expect(isCrossSite(write({ 'sec-fetch-site': 'cross-site' }))).toBe(true)
    expect(isCrossSite(write({ 'sec-fetch-site': 'same-site' }))).toBe(true)
    expect(isCrossSite(write({ origin: 'https://evil.example' }))).toBe(true)
    expect(isCrossSite(write({ origin: 'null' }))).toBe(true)
  })

  it('reads a small body and refuses a large one, declared or not', async () => {
    expect(await readLimited(write({}, '{"a":1}'))).toBe('{"a":1}')
    expect(await readLimited(write({}), 10)).toBe('')
    expect(await readLimited(write({}, 'x'.repeat(11)), 10)).toBeNull()
    expect(await readLimited(write({ 'content-length': '999999' }, '{}'), 10)).toBeNull()
  })
})

describe('content security policy', () => {
  it('allows only the nonce for scripts and styles, and no framing', () => {
    const policy = contentSecurityPolicy('abc', { dev: false })
    expect(policy).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'")
    expect(policy).toContain("style-src 'self' 'nonce-abc'")
    expect(policy).toContain("frame-ancestors 'none'")
    expect(policy).toContain("object-src 'none'")
    expect(policy).not.toContain('unsafe-inline')
    expect(policy).not.toContain('unsafe-eval')
    expect(contentSecurityPolicy('abc', { dev: true })).toContain("'unsafe-eval'")
  })

  it('draws a fresh 128-bit nonce each time', () => {
    const nonces = new Set(Array.from({ length: 50 }, createNonce))
    expect(nonces.size).toBe(50)
    for (const nonce of nonces) expect(atob(nonce)).toHaveLength(16)
  })
})
