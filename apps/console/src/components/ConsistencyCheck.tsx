'use client'

import { useState } from 'react'
import { api } from '@/lib/client'
import type { Consistency } from '@/lib/consistency'
import { Panel } from './ui'

function Line({ label, items, tone }: { label: string; items: string[]; tone: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-muted">{label}</dt>
      <dd
        className={`font-mono tabular-nums ${items.length > 0 ? tone : 'text-text'}`}
        title={items.slice(0, 20).join(', ')}
      >
        {items.length}
      </dd>
    </div>
  )
}

export function ConsistencyCheck() {
  const [result, setResult] = useState<Consistency | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verify = async () => {
    setPending(true)
    setError(null)
    try {
      setResult((await api.consistency()) as Consistency)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check unavailable')
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel
      title="Exactly-once check"
      id="consistency"
      aside={
        <button type="button" className="btn" disabled={pending} onClick={() => void verify()}>
          {pending ? 'Checking…' : 'Verify now'}
        </button>
      }
    >
      <div className="px-4 py-4 text-sm" aria-live="polite">
        <p className="text-muted">
          Compares the simulator&apos;s ground truth with every order in the hub. During a storm the
          hub lags; once the faults stop, every line must come back to zero.
        </p>
        {error && (
          <p role="alert" className="mt-3 text-danger">
            {error}
          </p>
        )}
        {result && (
          <>
            <p className={`mt-4 font-medium ${result.consistent ? 'text-accent' : 'text-warn'}`}>
              {result.consistent
                ? `Consistent: ${result.expected} orders, each stored once at its latest version and acknowledged once.`
                : `Converging: ${result.stored} of ${result.expected} orders stored.`}
            </p>
            <dl className="mt-2 divide-y divide-line text-xs">
              <Line label="Missing from the hub" items={result.missing} tone="text-warn" />
              <Line label="Behind their latest version" items={result.behind} tone="text-warn" />
              <Line label="Not yet acknowledged" items={result.unacknowledged} tone="text-warn" />
              <Line
                label="Acknowledged with a wrong reference"
                items={result.wrongReference}
                tone="text-danger"
              />
              <Line
                label="Unknown to the marketplace"
                items={result.unexpected}
                tone="text-danger"
              />
            </dl>
          </>
        )}
      </div>
    </Panel>
  )
}
