'use client'

import { useState } from 'react'
import { api } from '@/lib/client'
import type { Action, Analysis } from '@/lib/hub'
import { Panel } from './ui'

const LEVEL: Record<Analysis['level'], { label: string; className: string }> = {
  ok: { label: 'OK', className: 'border-accent/50 text-accent' },
  degraded: { label: 'Degraded', className: 'border-warn/50 text-warn' },
  incident: { label: 'Incident', className: 'border-danger/50 text-danger' },
}

const ACTION_LABEL: Record<Action, string> = {
  replay_failed_messages: 'Replay the failure queue',
  pause_channel: 'Pause',
  resume_channel: 'Resume',
  reconcile_channel: 'Reconcile',
  none: 'No action needed',
}

export function IncidentAnalyst({
  onEvidence,
  onAction,
}: {
  onEvidence: (ids: string[]) => void
  onAction: () => void
}) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<Set<string>>(new Set())

  const analyse = async () => {
    setPending(true)
    setError(null)
    try {
      setAnalysis(await api.analyse())
      setDone(new Set())
      onEvidence([])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis unavailable')
    } finally {
      setPending(false)
    }
  }

  const run = async (action: Action, channel: string | null, key: string) => {
    try {
      await api.runAction(action, channel)
      setDone((d) => new Set(d).add(key))
      onAction()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Action failed')
    }
  }

  return (
    <Panel
      title="Incident analyst"
      id="analyst"
      aside={
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending}
          onClick={() => void analyse()}
        >
          {pending ? 'Analysing…' : 'Analyse now'}
        </button>
      }
    >
      <div className="space-y-4 px-4 py-4 text-sm" aria-live="polite" aria-busy={pending}>
        {!analysis && !error && (
          <p className="text-muted">
            Reads the last 30 minutes of the journal and explains what is going on. Every finding
            cites journal entries; every action waits for your click.
          </p>
        )}
        {error && (
          <p role="alert" className="text-danger">
            {error}
          </p>
        )}
        {analysis && (
          <>
            <div className="flex items-start gap-3">
              <span
                className={`shrink-0 rounded border px-2 py-0.5 font-mono text-[11px] tracking-wider uppercase ${LEVEL[analysis.level].className}`}
              >
                {LEVEL[analysis.level].label}
              </span>
              <p className="leading-6">{analysis.summary}</p>
            </div>

            {analysis.findings.length > 0 && (
              <ul className="space-y-3">
                {analysis.findings.map((finding, index) => (
                  <li key={index} className="rounded-lg border border-line bg-sunken/60 p-3">
                    <p className="font-medium">{finding.title}</p>
                    <p className="mt-1 leading-6 text-muted">{finding.explanation}</p>
                    <button
                      type="button"
                      className="mt-2 font-mono text-[11px] text-info underline-offset-4 hover:underline"
                      onClick={() => onEvidence(finding.evidence)}
                    >
                      Show evidence: {finding.evidence.map((id) => `#${id}`).join(' ')}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <ul className="space-y-2">
              {analysis.recommendations.map((r) => {
                const key = `${r.action}/${r.channel ?? ''}`
                return (
                  <li key={key} className="flex items-start justify-between gap-3">
                    <p className="leading-6 text-muted">
                      <span className="text-text">
                        {ACTION_LABEL[r.action]}
                        {r.channel ? ` ${r.channel}` : ''}
                      </span>
                      {' — '}
                      {r.rationale}
                    </p>
                    {r.action !== 'none' && (
                      <button
                        type="button"
                        className="btn shrink-0"
                        disabled={done.has(key)}
                        onClick={() => void run(r.action, r.channel, key)}
                      >
                        {done.has(key) ? 'Done' : 'Run'}
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>

            <p className="font-mono text-[11px] text-faint">
              engine {analysis.engine}
              {analysis.fallback_reason ? ` · ${analysis.fallback_reason}` : ''}
              {analysis.discarded > 0
                ? ` · ${analysis.discarded} unverifiable item(s) discarded`
                : ''}
            </p>
          </>
        )}
      </div>
    </Panel>
  )
}
