import { act, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ChannelsPanel } from '@/components/ChannelsPanel'
import { ConsistencyCheck } from '@/components/ConsistencyCheck'
import { ControlRoom } from '@/components/ControlRoom'
import { FailureQueue } from '@/components/FailureQueue'
import { JournalFeed } from '@/components/JournalFeed'
import { RecentOrders } from '@/components/RecentOrders'
import { ago, money, percent, time } from '@/lib/format'
import type { Channel, JournalEntry, Marketplace } from '@/lib/hub'
import { usePolling } from '@/lib/usePolling'

type Reply = unknown | ((init: RequestInit | undefined) => unknown)

/** Answers by URL prefix; an Error value becomes a 500 with that message. */
function mockFetch(routes: Record<string, Reply>) {
  const calls: { url: string; init: RequestInit | undefined }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      calls.push({ url, init })
      const key = Object.keys(routes)
        .filter((k) => url.startsWith(k))
        .sort((a, b) => b.length - a.length)[0]
      const reply = key === undefined ? new Error('not mocked') : routes[key]
      const body = typeof reply === 'function' ? (reply as (i: unknown) => unknown)(init) : reply
      if (body instanceof Error) {
        return Promise.resolve(Response.json({ error: body.message }, { status: 500 }))
      }
      return Promise.resolve(Response.json(body))
    }),
  )
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

const entry = (id: number, severity: JournalEntry['severity'], message: string): JournalEntry => ({
  id: String(id),
  occurred_at: '2026-09-28T10:00:0' + String(id % 10) + 'Z',
  channel: id % 2 ? 'nova' : null,
  type: 'order.created',
  severity,
  message,
  context: {},
})

describe('format', () => {
  it('formats money, times, ages and ratios', () => {
    expect(money(123456, 'EUR')).toBe('€1,234.56')
    expect(time('2026-09-28T10:11:12Z')).toBe('10:11:12')
    expect(time(null)).toBe('—')
    expect(time('not a date')).toBe('—')
    const now = Date.parse('2026-09-28T12:00:00Z')
    expect(ago(null, now)).toBe('never')
    expect(ago('2026-09-28T11:59:50Z', now)).toBe('10s ago')
    expect(ago('2026-09-28T11:55:00Z', now)).toBe('5 min ago')
    expect(ago('2026-09-28T09:00:00Z', now)).toBe('3 h ago')
    expect(ago('2026-09-28T12:00:30Z', now)).toBe('0s ago')
    expect(percent(0.456)).toBe('46%')
  })
})

describe('usePolling', () => {
  it('keeps the last good data and reports the failure', async () => {
    let fail = false
    const load = vi.fn(() => (fail ? Promise.reject(new Error('down')) : Promise.resolve(42)))
    const { result } = renderHook(() => usePolling(load, 60_000))
    await waitFor(() => expect(result.current.data).toBe(42))
    fail = true
    await act(() => result.current.refresh())
    expect(result.current.data).toBe(42)
    expect(result.current.error).toBe('down')
    fail = false
    await act(() => result.current.refresh())
    expect(result.current.error).toBeNull()
  })
})

describe('JournalFeed', () => {
  it('tails the journal, filters by severity and highlights cited entries', async () => {
    const calls = mockFetch({
      '/api/hub/api/journal': {
        entries: [entry(1, 'info', 'Order imported'), entry(2, 'error', 'Webhook refused')],
        last_id: '2',
      },
    })
    render(<JournalFeed highlighted={new Set(['2'])} />)

    const list = screen.getByRole('list', { name: /Journal entries/ })
    expect(await within(list).findByText('Order imported')).toBeInTheDocument()
    expect(within(list).getByText('Webhook refused').closest('li')).toHaveClass('ring-1')
    expect(calls[0]?.url).toBe('/api/hub/api/journal?limit=200')

    await userEvent.click(screen.getByRole('button', { name: 'Errors' }))
    expect(within(list).queryByText('Order imported')).not.toBeInTheDocument()
    expect(within(list).getByText('Webhook refused')).toBeInTheDocument()
  })

  it('says when the journal is unreachable', async () => {
    mockFetch({ '/api/hub/api/journal': new Error('Upstream unreachable.') })
    render(<JournalFeed highlighted={new Set()} />)
    expect(await screen.findByText('Upstream unreachable.')).toBeInTheDocument()
    expect(screen.getByText('Waiting for the first events…')).toBeInTheDocument()
  })
})

describe('ConsistencyCheck', () => {
  it('shows the verdict line by line', async () => {
    mockFetch({
      '/api/consistency': {
        expected: 3,
        stored: 2,
        missing: ['nova/N-3'],
        behind: [],
        unacknowledged: ['nova/N-2'],
        wrongReference: [],
        unexpected: [],
        consistent: false,
      },
    })
    render(<ConsistencyCheck />)
    await userEvent.click(screen.getByRole('button', { name: 'Verify now' }))
    expect(await screen.findByText('Converging: 2 of 3 orders stored.')).toBeInTheDocument()
    expect(screen.getByText('Missing from the hub').nextSibling).toHaveTextContent('1')
  })

  it('reports a refused check, such as the rate limit', async () => {
    mockFetch({ '/api/consistency': new Error('The public demo limits this action.') })
    render(<ConsistencyCheck />)
    await userEvent.click(screen.getByRole('button', { name: 'Verify now' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('limits this action')
  })
})

describe('RecentOrders', () => {
  it('lists orders and their acknowledgement', () => {
    render(
      <RecentOrders
        error={null}
        orders={[
          {
            id: 'u1',
            channel: 'nova',
            externalId: 'NOVA-000001',
            status: 'shipped',
            totalMinor: 2990,
            currency: 'EUR',
            version: 3,
            firstSource: 'webhook',
            lastChangedAt: '2026-09-28T10:00:00Z',
            acknowledgedAt: '2026-09-28T10:00:01Z',
          },
        ]}
      />,
    )
    const row = screen.getByText('NOVA-000001').closest('tr')
    expect(row).toHaveTextContent('€29.90')
    expect(row).toHaveTextContent('v3')
    expect(row).toHaveTextContent('yes')
  })

  it('explains an empty list', () => {
    render(<RecentOrders orders={[]} error={null} />)
    expect(screen.getByText(/No order yet/)).toBeInTheDocument()
  })
})

describe('FailureQueue', () => {
  it('replays one message and refreshes', async () => {
    const calls = mockFetch({ '/api/hub/api/failed-messages/7/replay': { replayed: 1 } })
    const onChange = vi.fn()
    render(
      <FailureQueue
        error={null}
        onChange={onChange}
        data={{
          count: 1,
          messages: [
            {
              id: '7',
              type: 'AcknowledgeOrder',
              channel: 'atlas',
              order_id: 'u1',
              attempts: 5,
              error: 'Marketplace unavailable',
              failed_at: '2026-09-28T10:00:00Z',
            },
          ],
        }}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: /^Replay$/ }))
    await waitFor(() => expect(onChange).toHaveBeenCalled())
    expect(calls[0]).toMatchObject({ url: '/api/hub/api/failed-messages/7/replay' })
    expect(calls[0]?.init?.method).toBe('POST')
  })
})

const channel: Channel = {
  code: 'atlas',
  name: 'Atlas Marketplace',
  supports_webhooks: false,
  poll_interval_seconds: 5,
  paused: false,
  throttled_until: null,
  cursor: null,
  reconciliation_in_progress: false,
  last_poll_at: '2026-09-28T09:59:50Z',
  last_poll_outcome: 'completed',
  orders: 4,
  acknowledged: 2,
  updated_last_5_min: 1,
}
const marketplace: Marketplace = {
  code: 'atlas',
  name: 'Atlas Marketplace',
  supports_webhooks: false,
  orders: 4,
  capacity: { max_orders: 2000, reached: false },
  chaos: {
    latencyMs: { min: 0, max: 0 },
    errorRate: 0,
    rateLimit: { capacity: 10, refillPerSecond: 2 },
    visibilityDelayMaxMs: 0,
    webhooks: { dropRate: 0, duplicateRate: 0, maxDelayMs: 0 },
    generation: { ordersPerMinute: 12, updatesPerMinute: 12 },
  },
  api: { requests: 0, throttled: 0, injectedErrors: 0 },
  webhooks: { emitted: 0, dropped: 0, duplicated: 0, delivered: 0 },
}

describe('ChannelsPanel', () => {
  const now = Date.parse('2026-09-28T10:00:00Z')

  it('drives the channel and its marketplace', async () => {
    const calls = mockFetch({
      '/api/hub/api/channels/atlas/pause': {},
      '/api/simulator/control/marketplaces/atlas/preset/storm': {},
    })
    const onChange = vi.fn()
    render(
      <ChannelsPanel
        channels={[channel]}
        marketplaces={[marketplace]}
        error={null}
        now={now}
        onChange={onChange}
      />,
    )
    const card = screen.getByRole('article', { name: 'Channel Atlas Marketplace' })
    expect(within(card).getByText('healthy')).toBeInTheDocument()
    expect(within(card).getByText('50%')).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Calm' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await userEvent.click(within(card).getByRole('button', { name: 'Storm' }))
    await userEvent.click(within(card).getByRole('button', { name: 'Pause' }))
    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(2))
    expect(calls.map((c) => [c.url, c.init?.method])).toEqual([
      ['/api/simulator/control/marketplaces/atlas/preset/storm', 'PUT'],
      ['/api/hub/api/channels/atlas/pause', 'POST'],
    ])
  })

  it('shows why a channel is waiting, and a refused action', async () => {
    mockFetch({
      '/api/hub/api/channels/atlas/resume': new Error('The public demo limits this action.'),
    })
    const paused = { ...channel, paused: true }
    const { rerender } = render(
      <ChannelsPanel
        channels={[paused]}
        marketplaces={null}
        error={null}
        now={now}
        onChange={() => undefined}
      />,
    )
    expect(screen.getByText('paused by an operator')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('limits this action')

    rerender(
      <ChannelsPanel
        channels={[{ ...channel, throttled_until: '2026-09-28T10:05:00Z' }]}
        marketplaces={null}
        error={null}
        now={now}
        onChange={() => undefined}
      />,
    )
    expect(screen.getByText('backing off until 10:05:00')).toBeInTheDocument()
  })
})

describe('ControlRoom', () => {
  it('assembles the live panels and tells visitors the demo is shared', async () => {
    mockFetch({
      '/api/hub/api/overview': {
        generated_at: '2026-09-28T10:00:00Z',
        orders: 4,
        acknowledged: 2,
        failed_messages: 0,
        events_last_15_min: {},
      },
      '/api/hub/api/channels': { channels: [channel] },
      '/api/simulator/control/marketplaces': { marketplaces: [marketplace] },
      '/api/hub/api/failed-messages': { count: 0, messages: [] },
      '/api/hub/api/orders': [],
      '/api/hub/api/journal': { entries: [], last_id: null },
    })
    render(<ControlRoom publicDemo />)
    expect(
      await screen.findByRole('article', { name: 'Channel Atlas Marketplace' }),
    ).toBeInTheDocument()
    expect(screen.getByText('live')).toBeInTheDocument()
    expect(screen.getByText(/Public demo: every visitor drives the same/)).toBeInTheDocument()
    expect(screen.getByText(/SQLite \(PostgreSQL in production\)/)).toBeInTheDocument()
  })

  it('says when the hub is unreachable', async () => {
    mockFetch({})
    render(<ControlRoom />)
    expect(await screen.findByText('hub unreachable')).toBeInTheDocument()
    expect(screen.queryByText(/Public demo/)).not.toBeInTheDocument()
  })
})
