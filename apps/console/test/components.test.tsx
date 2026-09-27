import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IncidentAnalyst } from '@/components/IncidentAnalyst'
import { OverviewBar } from '@/components/OverviewBar'
import { FailureQueue } from '@/components/FailureQueue'

function mockFetch(responses: Record<string, unknown>) {
  const calls: { url: string; init: RequestInit | undefined }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string, init?: RequestInit) => {
      calls.push({ url, init })
      const body = responses[url] ?? { error: 'not mocked' }
      return Promise.resolve(
        new Response(JSON.stringify(body), { status: url in responses ? 200 : 500 }),
      )
    }),
  )
  return calls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('IncidentAnalyst', () => {
  it('shows the diagnosis, lets the operator inspect evidence and run one action', async () => {
    const calls = mockFetch({
      '/api/hub/api/incident-analyses': {
        engine: 'rules',
        fallback_reason: 'No model configured.',
        level: 'degraded',
        summary: 'Degraded: atlas hit its quota.',
        findings: [
          { title: 'atlas hit its quota', explanation: 'Throttled.', evidence: ['12', '15'] },
        ],
        recommendations: [
          { action: 'reconcile_channel', channel: 'atlas', rationale: 'Catch up.' },
        ],
        discarded: 1,
        evidence: [
          {
            id: '12',
            occurred_at: '2026-09-26T10:00:00Z',
            channel: 'atlas',
            type: 'channel.rate_limited',
            severity: 'warning',
            message: 'Quota exceeded.',
          },
        ],
      },
      '/api/hub/api/incident-analyses/actions': { status: 'done' },
    })
    const onEvidence = vi.fn()
    const onAction = vi.fn()
    const user = userEvent.setup()
    render(<IncidentAnalyst onEvidence={onEvidence} onAction={onAction} />)

    await user.click(screen.getByRole('button', { name: 'Analyse now' }))

    expect(await screen.findByText('Degraded: atlas hit its quota.')).toBeInTheDocument()
    expect(screen.getByText(/1 unverifiable item\(s\) discarded/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Show evidence/ }))
    expect(onEvidence).toHaveBeenLastCalledWith(['12', '15'])
    expect(
      screen.getByRole('list', { name: 'Evidence for atlas hit its quota' }),
    ).toHaveTextContent('Quota exceeded.')

    await user.click(screen.getByRole('button', { name: /Hide evidence/ }))
    expect(onEvidence).toHaveBeenLastCalledWith([])

    await user.click(screen.getByRole('button', { name: 'Run' }))
    expect(await screen.findByRole('button', { name: 'Done' })).toBeDisabled()
    expect(JSON.parse(String(calls.at(-1)?.init?.body))).toEqual({
      action: 'reconcile_channel',
      channel: 'atlas',
    })
    expect(onAction).toHaveBeenCalledOnce()
  })

  it('reports an unavailable analysis without crashing', async () => {
    mockFetch({})
    const user = userEvent.setup()
    render(<IncidentAnalyst onEvidence={vi.fn()} onAction={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Analyse now' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('not mocked')
  })
})

describe('OverviewBar', () => {
  it('adds up absorbed deliveries and flags the failure queue', () => {
    render(
      <OverviewBar
        overview={{
          generated_at: '2026-09-26T10:00:00Z',
          orders: 12,
          acknowledged: 10,
          failed_messages: 2,
          events_last_15_min: {
            'webhook.duplicate': 3,
            'order.stale_ignored': 1,
            'order.duplicate_ignored': 1,
          },
        }}
      />,
    )
    const absorbed = screen.getByText('Absorbed · 15 min').closest('div')
    expect(absorbed && within(absorbed).getByText('5')).toBeInTheDocument()
    expect(screen.getByText('2')).toHaveClass('text-danger')
  })

  it('shows placeholders before the first answer', () => {
    render(<OverviewBar overview={null} />)
    expect(screen.getAllByText('—')).toHaveLength(5)
  })
})

describe('FailureQueue', () => {
  it('explains an empty queue and disables replay', () => {
    render(<FailureQueue data={{ count: 0, messages: [] }} error={null} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Replay all' })).toBeDisabled()
    expect(screen.getByText(/Messages land here only after every retry/)).toBeInTheDocument()
  })
})
