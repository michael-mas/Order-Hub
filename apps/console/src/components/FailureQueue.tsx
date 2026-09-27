'use client'

import { useState } from 'react'
import { api } from '@/lib/client'
import { time } from '@/lib/format'
import type { FailedMessage } from '@/lib/hub'
import { ErrorNote, Panel } from './ui'

export function FailureQueue({
  data,
  error,
  onChange,
}: {
  data: { count: number; messages: FailedMessage[] } | null
  error: string | null
  onChange: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    setActionError(null)
    try {
      await action()
      onChange()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Replay failed')
    } finally {
      setBusy(false)
    }
  }

  const count = data?.count ?? 0

  return (
    <Panel
      title={`Failure queue${data ? ` · ${count}` : ''}`}
      id="failures"
      aside={
        <button
          type="button"
          className="btn"
          disabled={busy || count === 0}
          onClick={() => void run(api.replayAll)}
        >
          Replay all
        </button>
      }
    >
      <ErrorNote message={error ?? actionError} />
      {count === 0 ? (
        <p className="px-4 py-4 text-sm text-muted">
          Empty. Messages land here only after every retry has failed; a replay sends them back with
          a fresh budget.
        </p>
      ) : (
        <ul
          className="max-h-64 divide-y divide-line overflow-y-auto"
          tabIndex={0}
          aria-label="Failed messages"
        >
          {data?.messages.map((m) => (
            <li key={m.id} className="flex items-start justify-between gap-3 px-4 py-3 text-xs">
              <div className="min-w-0">
                <p className="font-medium text-text">
                  {m.type}
                  <span className="ml-2 font-mono text-faint">
                    {m.channel ?? '—'} · {m.attempts} attempt{m.attempts > 1 ? 's' : ''} ·{' '}
                    {time(m.failed_at)}
                  </span>
                </p>
                <p className="mt-1 truncate text-muted" title={m.error}>
                  {m.error}
                </p>
              </div>
              <button
                type="button"
                className="btn shrink-0"
                disabled={busy}
                onClick={() => void run(() => api.replay(m.id))}
              >
                Replay
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
