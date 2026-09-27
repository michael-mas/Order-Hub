import type { Overview } from '@/lib/hub'

function Metric({
  label,
  value,
  tone = 'text-text',
  hint,
}: {
  label: string
  value: string
  tone?: string
  hint: string
}) {
  return (
    <div className="min-w-0 px-4 py-3" title={hint}>
      <dt className="panel-title truncate">{label}</dt>
      <dd className={`metric mt-1 ${tone}`}>{value}</dd>
    </div>
  )
}

export function OverviewBar({ overview }: { overview: Overview | null }) {
  const events = overview?.events_last_15_min ?? {}
  const absorbed =
    (events['webhook.duplicate'] ?? 0) +
    (events['order.duplicate_ignored'] ?? 0) +
    (events['order.stale_ignored'] ?? 0)
  const throttles = events['channel.rate_limited'] ?? 0
  const failed = overview?.failed_messages ?? 0
  const show = (n: number | undefined) => (overview ? String(n ?? 0) : '—')

  return (
    <dl className="panel grid grid-cols-2 divide-line sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
      <Metric
        label="Orders stored"
        value={show(overview?.orders)}
        hint="Distinct orders held by the hub, at their latest version."
      />
      <Metric
        label="Acknowledged"
        value={show(overview?.acknowledged)}
        tone="text-accent"
        hint="Orders the marketplace has been told are safely stored."
      />
      <Metric
        label="Failure queue"
        value={show(failed)}
        tone={failed > 0 ? 'text-danger' : 'text-text'}
        hint="Messages that exhausted their retries, waiting for a replay."
      />
      <Metric
        label="Absorbed · 15 min"
        value={show(absorbed)}
        tone="text-info"
        hint="Duplicate or out-of-order deliveries recognised and ignored."
      />
      <Metric
        label="Throttled · 15 min"
        value={show(throttles)}
        tone={throttles > 0 ? 'text-warn' : 'text-text'}
        hint="Times a marketplace answered 429 and the hub backed off."
      />
    </dl>
  )
}
