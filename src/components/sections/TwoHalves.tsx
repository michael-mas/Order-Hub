import { Pending } from '../Pending'
import { Section } from '../Section'

const HALVES = [
  {
    title: 'La production',
    href: '#travail',
    note: 'trois faits de périmètre — stack, plateformes, ordre de grandeur',
  },
  {
    title: 'Le rendu temps réel',
    href: '#cas-system-alive',
    note: 'trois faits sur le travail GPU, vérifiés dans le dépôt',
  },
]

export function TwoHalves() {
  return (
    <Section id="deux-moities" index={1} label="Profil" title="Deux moitiés" act="halves">
      <div className="grid gap-6 md:grid-cols-2">
        {HALVES.map((half) => (
          <article key={half.title} className="rounded-[14px] border border-border bg-surface p-6">
            <h3 className="text-h3 font-semibold">{half.title}</h3>
            <p className="mt-3 text-text-muted">
              <Pending kind="write">{half.note}</Pending>
            </p>
            <a href={half.href} className="mt-4 inline-block text-sm">
              Voir le cas →
            </a>
          </article>
        ))}
      </div>
    </Section>
  )
}
