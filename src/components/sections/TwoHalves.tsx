import type { Profile } from '@/content/profile'
import { Section } from '../Section'

export function TwoHalves({ halves }: { halves: Profile['halves'] }) {
  return (
    <Section id="profil" index={1} label="Profil" title="Ce que je fais" act="halves">
      <div className="grid gap-6 md:grid-cols-2">
        {halves.map((half) => (
          <article
            key={half.title}
            className="flex flex-col rounded-[14px] border border-border bg-surface p-6"
          >
            <h3 className="text-h3 font-semibold">{half.title}</h3>
            <p className="mt-3 text-text-muted">{half.summary}</p>
            <ul className="mt-5 space-y-2 border-t border-border pt-5">
              {half.facts.map((fact) => (
                <li key={fact} className="flex gap-3">
                  <span
                    aria-hidden="true"
                    className="mt-[0.7em] h-1 w-1 shrink-0 rounded-full bg-accent"
                  />
                  <span>{fact}</span>
                </li>
              ))}
            </ul>
            <a href={half.href} className="mt-auto pt-5 text-sm">
              Voir le cas →
            </a>
          </article>
        ))}
      </div>
    </Section>
  )
}
