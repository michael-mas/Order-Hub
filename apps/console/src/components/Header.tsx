import { StatusDot } from './ui'

export function Header({ live }: { live: boolean }) {
  return (
    <header className="border-b border-line bg-sunken/60">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-sm font-semibold tracking-[0.2em] text-accent uppercase">
            Order Hub
          </span>
          <span className="text-sm text-muted">control room</span>
        </div>
        <div className="flex items-center gap-5">
          <StatusDot
            tone={live ? 'ok' : 'danger'}
            pulse={live}
            label={live ? 'live' : 'hub unreachable'}
          />
          <a
            className="text-xs text-muted underline-offset-4 hover:text-text hover:underline"
            href="https://github.com/michael-mas/Order-Hub"
          >
            Source on GitHub
          </a>
        </div>
      </div>
    </header>
  )
}
