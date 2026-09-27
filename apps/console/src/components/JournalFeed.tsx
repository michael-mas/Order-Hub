'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@/lib/client'
import { time } from '@/lib/format'
import type { JournalEntry, Severity } from '@/lib/hub'
import { mergeJournal } from '@/lib/journal'
import { ErrorNote, Panel, SeverityBadge } from './ui'

const FILTERS: { value: Severity; label: string }[] = [
  { value: 'info', label: 'All' },
  { value: 'warning', label: 'Warnings' },
  { value: 'error', label: 'Errors' },
]
const RANK: Record<Severity, number> = { info: 0, warning: 1, error: 2 }
const TAIL_MS = 1500

export function JournalFeed({ highlighted }: { highlighted: ReadonlySet<string> }) {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [filter, setFilter] = useState<Severity>('info')
  const [error, setError] = useState<string | null>(null)
  const lastId = useRef<string | null>(null)
  const list = useRef<HTMLOListElement>(null)

  useEffect(() => {
    let cancelled = false
    const tail = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const page = await api.journal(lastId.current)
        if (cancelled) return
        if (page.entries.length > 0) {
          lastId.current = page.last_id
          setEntries((current) => mergeJournal(current, page.entries))
        }
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Journal unavailable')
      }
    }
    void tail()
    const timer = setInterval(() => void tail(), TAIL_MS)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    const first = [...highlighted][0]
    if (first)
      document
        .getElementById(`entry-${first}`)
        ?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [highlighted])

  const visible = useMemo(
    () => entries.filter((e) => RANK[e.severity] >= RANK[filter]).toReversed(),
    [entries, filter],
  )

  return (
    <Panel
      title="Live journal"
      id="journal"
      className="h-full"
      aside={
        <div className="flex gap-1" role="group" aria-label="Filter the journal">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              aria-pressed={filter === f.value}
              className={`rounded px-2 py-0.5 text-[11px] ${filter === f.value ? 'bg-raised text-text' : 'text-muted hover:text-text'}`}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </button>
          ))}
        </div>
      }
    >
      <ErrorNote message={error} />
      <ol
        ref={list}
        aria-live="off"
        aria-label="Journal entries, newest first"
        // Scrollable: reachable with the keyboard.
        tabIndex={0}
        className="max-h-[680px] min-h-[320px] flex-1 overflow-y-auto font-mono text-xs"
      >
        {visible.map((entry) => (
          <li
            key={entry.id}
            id={`entry-${entry.id}`}
            className={`animate-enter flex flex-wrap gap-x-3 gap-y-1 border-b sm:flex-nowrap border-line/60 px-4 py-2 ${
              highlighted.has(entry.id) ? 'bg-accent/10 ring-1 ring-accent/50 ring-inset' : ''
            }`}
          >
            <span className="w-14 shrink-0 text-faint tabular-nums">{time(entry.occurred_at)}</span>
            <SeverityBadge severity={entry.severity} />
            <span className="w-12 shrink-0 text-muted">{entry.channel ?? 'hub'}</span>
            <span className="min-w-0 basis-full font-sans text-[13px] leading-5 text-text sm:flex-1 sm:basis-auto">
              {entry.message}
              <span className="ml-2 font-mono text-[10px] text-faint">
                {entry.type} · #{entry.id}
              </span>
            </span>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="px-4 py-6 font-sans text-sm text-muted">
            {entries.length === 0 ? 'Waiting for the first events…' : 'Nothing at this level.'}
          </li>
        )}
      </ol>
    </Panel>
  )
}
