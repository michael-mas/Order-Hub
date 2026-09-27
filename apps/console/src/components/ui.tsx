import type { ReactNode } from 'react'
import type { Severity } from '@/lib/hub'

export function Panel({
  title,
  aside,
  children,
  className = '',
  id,
}: {
  title: string
  aside?: ReactNode
  children: ReactNode
  className?: string
  id?: string
}) {
  const headingId = id ? `${id}-title` : undefined
  return (
    <section
      className={`panel flex min-w-0 flex-col ${className}`}
      aria-labelledby={headingId}
      id={id}
    >
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="panel-title" id={headingId}>
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  )
}

const SEVERITY: Record<Severity, string> = {
  info: 'text-info border-info/30',
  warning: 'text-warn border-warn/40',
  error: 'text-danger border-danger/40',
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={`inline-block h-fit w-[4.25rem] shrink-0 self-start rounded border px-1.5 py-px text-center font-mono text-[10px] tracking-wider uppercase ${SEVERITY[severity]}`}
    >
      {severity === 'warning' ? 'warn' : severity}
    </span>
  )
}

export type Tone = 'ok' | 'warn' | 'danger' | 'idle'

const TONE: Record<Tone, string> = {
  ok: 'bg-accent',
  warn: 'bg-warn',
  danger: 'bg-danger',
  idle: 'bg-faint',
}

export function StatusDot({
  tone,
  pulse = false,
  label,
}: {
  tone: Tone
  pulse?: boolean
  label: string
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className={`inline-block size-2 rounded-full ${TONE[tone]} ${pulse ? 'animate-pulse-dot' : ''}`}
      />
      <span className="text-xs text-muted">{label}</span>
    </span>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="status" className="px-4 py-2 text-xs text-danger">
      {message}
    </p>
  )
}
