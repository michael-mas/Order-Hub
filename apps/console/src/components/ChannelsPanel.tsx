'use client'

import { useState } from 'react'
import { api } from '@/lib/client'
import { ago, percent, time } from '@/lib/format'
import type { Channel, Marketplace } from '@/lib/hub'
import { ErrorNote, Panel, StatusDot, type Tone } from './ui'

const PRESETS = [
  { name: 'calm', label: 'Calm', hint: 'A well-behaved channel.' },
  { name: 'busy', label: 'Busy', hint: 'Sales peak: tight quota, slow answers, some duplicates.' },
  { name: 'storm', label: 'Storm', hint: 'Everything that can go wrong, at once.' },
] as const

function status(channel: Channel, now: number): { tone: Tone; label: string } {
  if (channel.paused) return { tone: 'idle', label: 'paused by an operator' }
  if (channel.throttled_until && Date.parse(channel.throttled_until) > now) {
    return { tone: 'warn', label: `backing off until ${time(channel.throttled_until)}` }
  }
  if (channel.last_poll_outcome === 'failed') return { tone: 'danger', label: 'last poll failed' }
  if (channel.last_poll_outcome === 'partial')
    return { tone: 'warn', label: 'catching up a backlog' }
  return { tone: 'ok', label: 'healthy' }
}

function currentPreset(marketplace: Marketplace | undefined): string | null {
  if (!marketplace) return null
  const { errorRate, webhooks } = marketplace.chaos
  if (errorRate === 0 && webhooks.dropRate === 0) return 'calm'
  if (errorRate >= 0.3) return 'storm'
  return 'busy'
}

function ChannelCard({
  channel,
  marketplace,
  now,
  onChange,
}: {
  channel: Channel
  marketplace: Marketplace | undefined
  now: number
  onChange: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { tone, label } = status(channel, now)
  const preset = currentPreset(marketplace)

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      onChange()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className="border-b border-line px-4 py-4 last:border-b-0"
      aria-label={`Channel ${channel.name}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-medium">{channel.name}</h3>
          <p className="mt-0.5 font-mono text-[11px] tracking-wide text-faint uppercase">
            {channel.supports_webhooks
              ? 'webhooks + polling'
              : `polling every ${channel.poll_interval_seconds}s`}
          </p>
        </div>
        <StatusDot tone={tone} pulse={tone === 'ok'} label={label} />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-faint">Orders</dt>
          <dd className="font-mono text-base tabular-nums">{channel.orders}</dd>
        </div>
        <div>
          <dt className="text-faint">Acknowledged</dt>
          <dd className="font-mono text-base tabular-nums">
            {channel.orders === 0 ? '—' : percent(channel.acknowledged / channel.orders)}
          </dd>
        </div>
        <div>
          <dt className="text-faint">Last poll</dt>
          <dd className="font-mono text-base tabular-nums">{ago(channel.last_poll_at, now)}</dd>
        </div>
      </dl>

      <div className="mt-4 rounded-lg border border-line bg-sunken/70 p-3">
        <p className="panel-title">Marketplace behaviour</p>
        <div
          className="mt-2 flex flex-wrap gap-1.5"
          role="group"
          aria-label={`Faults for ${channel.name}`}
        >
          {PRESETS.map((p) => (
            <button
              key={p.name}
              type="button"
              className={`btn ${preset === p.name ? 'border-accent text-accent-strong' : ''}`}
              aria-pressed={preset === p.name}
              title={p.hint}
              disabled={busy || !marketplace}
              onClick={() => void run(() => api.preset(channel.code, p.name))}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            className="btn"
            title="Create 20 orders and 20 updates at once."
            disabled={busy || !marketplace}
            onClick={() => void run(() => api.burst(channel.code))}
          >
            +20 orders
          </button>
        </div>
        {marketplace && (
          <p className="mt-2 font-mono text-[11px] leading-5 text-faint">
            quota {marketplace.chaos.rateLimit.capacity} burst ·{' '}
            {marketplace.chaos.rateLimit.refillPerSecond}/s · errors{' '}
            {percent(marketplace.chaos.errorRate)}
            {marketplace.supports_webhooks &&
              ` · webhooks lost ${percent(marketplace.chaos.webhooks.dropRate)}, doubled ${percent(marketplace.chaos.webhooks.duplicateRate)}`}
          </p>
        )}
      </div>

      <div
        className="mt-3 flex flex-wrap gap-1.5"
        role="group"
        aria-label={`Operations on ${channel.name}`}
      >
        {channel.paused ? (
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void run(() => api.channelAction(channel.code, 'resume'))}
          >
            Resume
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={() => void run(() => api.channelAction(channel.code, 'pause'))}
          >
            Pause
          </button>
        )}
        <button
          type="button"
          className="btn"
          disabled={busy}
          title="Sweep the last 15 minutes of the marketplace again."
          onClick={() => void run(() => api.channelAction(channel.code, 'reconcile'))}
        >
          Reconcile
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-danger">
          {error}
        </p>
      )}
    </article>
  )
}

export function ChannelsPanel({
  channels,
  marketplaces,
  error,
  now,
  onChange,
}: {
  channels: Channel[] | null
  marketplaces: Marketplace[] | null
  error: string | null
  now: number
  onChange: () => void
}) {
  return (
    <Panel title="Channels" id="channels">
      <ErrorNote message={error} />
      {channels?.map((channel) => (
        <ChannelCard
          key={channel.code}
          channel={channel}
          marketplace={marketplaces?.find((m) => m.code === channel.code)}
          now={now}
          onChange={onChange}
        />
      ))}
      {!channels && !error && (
        <p className="px-4 py-6 text-sm text-muted">Connecting to the hub…</p>
      )}
    </Panel>
  )
}
