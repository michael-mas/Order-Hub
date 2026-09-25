import { formatMonthYear } from '@/content/format'
import type { Profile } from '@/content/profile'
import { Pending } from '../Pending'

export function Hero({ profile }: { profile: Profile }) {
  const current = profile.positions[0]!
  const lengowStart = profile.positions.at(-1)!.start
  return (
    <section
      id="top"
      aria-labelledby="hero-title"
      data-scene-act="hero"
      className="mx-auto flex min-h-[calc(100svh-3.5rem)] max-w-[1440px] flex-col justify-center px-[var(--gutter)] py-16"
    >
      <h1
        id="hero-title"
        className="text-display leading-[0.92] font-extrabold tracking-[-0.035em] uppercase"
      >
        {profile.name}
      </h1>
      <p className="mt-6 max-w-[56ch] text-lead text-text">{profile.headline}</p>
      <p className="mt-3 max-w-[56ch] text-text-muted">
        <Pending kind="write">phrase d&apos;accroche</Pending>
      </p>
      <ul className="label-mono mt-8 flex flex-wrap gap-x-6 gap-y-2 text-text-muted">
        <li>
          {current.title} · {current.company}
        </li>
        <li>
          chez {current.company} depuis {formatMonthYear(lengowStart)}
        </li>
        <li>{profile.location}</li>
        <li className="text-accent">{profile.status}</li>
      </ul>
      <div className="mt-10 flex flex-wrap gap-3">
        <a
          href="#travail"
          className="rounded-md bg-accent px-5 py-3 font-medium text-on-accent no-underline hover:bg-accent-hover"
        >
          Voir le travail
        </a>
        <a
          href="#contact"
          className="rounded-md border border-border-strong px-5 py-3 font-medium text-text no-underline hover:border-accent"
        >
          Me contacter
        </a>
      </div>
    </section>
  )
}
