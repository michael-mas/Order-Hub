import { formatMonthYear } from '@/content/format'
import type { Profile } from '@/content/profile'
import { Section } from '../Section'

export function Path({ profile }: { profile: Profile }) {
  const rows = [
    ...profile.positions.map((p) => ({
      period: `${formatMonthYear(p.start)} – ${p.end ? formatMonthYear(p.end) : "aujourd'hui"}`,
      label: `${p.title} · ${p.company}`,
    })),
    ...profile.earlierPath,
  ]
  return (
    <Section
      id="parcours"
      index={7}
      label="Parcours"
      title="Une reconversion, une seule chronologie"
      act="path"
    >
      <ol className="max-w-[68ch] divide-y divide-border border-y border-border">
        {rows.map((row) => (
          <li key={row.label} className="grid gap-1 py-4 sm:grid-cols-[12rem_1fr] sm:gap-6">
            <span className="label-mono pt-1 text-text-faint">{row.period}</span>
            <span>{row.label}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6 max-w-[68ch] text-text-muted">
        {profile.education.join(' · ')}. Appris en grande partie seul, avec une formation AFPA.
      </p>
    </Section>
  )
}
