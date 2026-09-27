import { describe, expect, it } from 'vitest'
import { compare } from '@/lib/consistency'
import { createCooldown } from '@/lib/cooldown'
import type { JournalEntry } from '@/lib/hub'
import { mergeJournal } from '@/lib/journal'
import { HUB_ROUTES, isAllowed, SIMULATOR_ROUTES } from '@/lib/routes'

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

  it('does not confuse the same id on two channels', () => {
    const result = compare(
      [{ channel: 'nova', id: 'X', version: 1, acknowledgedRef: 'u1' }],
      [{ channel: 'atlas', externalId: 'X', version: 1, id: 'u1' }],
    )
    expect(result.missing).toEqual(['nova/X'])
    expect(result.unexpected).toEqual(['atlas/X'])
  })
})

describe('createCooldown', () => {
  it('allows one call per interval', () => {
    let now = 0
    const cooldown = createCooldown(1000, () => now)
    expect(cooldown.take()).toBe(0)
    now = 400
    expect(cooldown.take()).toBe(600)
    now = 1000
    expect(cooldown.take()).toBe(0)
  })
})
