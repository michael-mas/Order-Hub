'use client'

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/client'
import { usePolling } from '@/lib/usePolling'
import { ChannelsPanel } from './ChannelsPanel'
import { ConsistencyCheck } from './ConsistencyCheck'
import { FailureQueue } from './FailureQueue'
import { Header } from './Header'
import { IncidentAnalyst } from './IncidentAnalyst'
import { JournalFeed } from './JournalFeed'
import { OverviewBar } from './OverviewBar'
import { RecentOrders } from './RecentOrders'

const loadChannels = async () => (await api.channels()).channels
const loadMarketplaces = async () => (await api.marketplaces()).marketplaces

export function ControlRoom({ publicDemo = false }: { publicDemo?: boolean }) {
  const overview = usePolling(api.overview, 3000)
  const channels = usePolling(loadChannels, 3000)
  const marketplaces = usePolling(loadMarketplaces, 3000)
  const failed = usePolling(api.failedMessages, 4000)
  const orders = usePolling(api.orders, 3000)
  const [highlighted, setHighlighted] = useState<ReadonlySet<string>>(new Set())
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const refreshAll = useCallback(() => {
    void overview.refresh()
    void channels.refresh()
    void marketplaces.refresh()
    void failed.refresh()
  }, [overview, channels, marketplaces, failed])

  return (
    <>
      <Header live={overview.error === null} />
      <main className="mx-auto max-w-[1500px] space-y-4 px-4 py-6 sm:px-6">
        <div className="max-w-3xl">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Importing orders from marketplaces that misbehave — exactly once.
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted">
            Two simulated marketplaces send orders through signed webhooks and paginated APIs.
            Switch one to <em className="text-text not-italic">Storm</em>: lost and duplicated
            webhooks, late listings, quotas, outages. The journal shows every decision the hub
            takes; the exactly-once check proves nothing was lost or doubled.
          </p>
          <ol
            aria-label="Try it"
            className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs leading-5 text-muted"
          >
            <li>
              <span className="font-mono text-accent">1</span> Switch both channels to{' '}
              <span className="text-text">Storm</span>
            </li>
            <li>
              <span className="font-mono text-accent">2</span> Watch the journal absorb it, then{' '}
              <span className="text-text">Analyse now</span>
            </li>
            <li>
              <span className="font-mono text-accent">3</span> Back to{' '}
              <span className="text-text">Calm</span>, <span className="text-text">Replay all</span>
            </li>
            <li>
              <span className="font-mono text-accent">4</span>{' '}
              <span className="text-text">Verify now</span> until it reads Consistent
            </li>
          </ol>
          {publicDemo && (
            <p className="mt-2 text-xs leading-5 text-faint">
              Public demo: every visitor drives the same simulated marketplaces, actions are
              rate-limited, and the whole system starts afresh at least once a day.
            </p>
          )}
        </div>

        <OverviewBar overview={overview.data} failedMessages={failed.data?.count} />

        <div className="grid gap-4 lg:grid-cols-[minmax(300px,1fr)_minmax(0,1.6fr)_minmax(300px,1.1fr)]">
          <ChannelsPanel
            channels={channels.data}
            marketplaces={marketplaces.data}
            error={channels.error ?? marketplaces.error}
            now={now}
            onChange={refreshAll}
          />
          <JournalFeed highlighted={highlighted} />
          <div className="flex min-w-0 flex-col gap-4">
            <IncidentAnalyst
              onEvidence={(ids) => setHighlighted(new Set(ids))}
              onAction={refreshAll}
            />
            <FailureQueue data={failed.data} error={failed.error} onChange={refreshAll} />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
          <ConsistencyCheck />
          <RecentOrders orders={orders.data} error={orders.error} />
        </div>
      </main>
      <footer className="mx-auto max-w-[1500px] px-4 pt-2 pb-8 text-xs text-faint sm:px-6">
        Symfony 8 · API Platform · Messenger ·{' '}
        {publicDemo ? 'SQLite (PostgreSQL in production)' : 'PostgreSQL'} — Next.js console —
        TypeScript simulator — Claude for incident analysis. Demo data only: no real merchant, order
        or buyer.
      </footer>
    </>
  )
}
