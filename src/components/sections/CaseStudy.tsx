import type { CaseStudy as CaseStudyData } from '@/content/profile'
import { Pending } from '../Pending'
import { Section } from '../Section'

interface CaseStudyProps {
  id: string
  index: number
  label: string
  act: string
  /** Written case, from profile.ts. Absent: every block shows a marker. */
  study?: CaseStudyData | undefined
  fallbackTitle: string
  source: string
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="label-mono text-text-faint">{title}</dt>
      <dd className="mt-2">{children}</dd>
    </div>
  )
}

export function CaseStudy({ id, index, label, act, study, fallbackTitle, source }: CaseStudyProps) {
  const text = (value: string | null | undefined, what: string) =>
    value ?? <Pending kind={study ? 'confirm' : 'write'}>{`${what} — ${source}`}</Pending>

  return (
    <Section id={id} index={index} label={label} title={study?.title ?? fallbackTitle} act={act}>
      <dl className="grid max-w-[68ch] gap-8">
        <Block title="Contexte">{text(study?.context, 'contexte')}</Block>
        <Block title="Le problème">{text(study?.problem, 'le problème')}</Block>
        <Block title="La contrainte">{text(study?.constraint, 'la contrainte')}</Block>
        <Block title="Les décisions">
          {study && study.decisions.length > 0 ? (
            <ol className="space-y-5">
              {study.decisions.map((d) => (
                <li key={d.choice} className="border-l-2 border-accent pl-4">
                  <p>{d.choice}</p>
                  <p className="mt-1 text-sm text-text-muted">
                    <span className="label-mono text-text-faint">Écarté</span> {d.rejected} —{' '}
                    {d.why}
                  </p>
                </li>
              ))}
            </ol>
          ) : (
            text(null, 'les décisions')
          )}
        </Block>
        <Block title="Le résultat">{text(study?.result, 'le résultat')}</Block>
        <Block title="Ce que je ferais autrement">
          {text(study?.differently, 'ce que je ferais autrement')}
        </Block>
        <Block title="Preuve">{text(study?.proof, 'preuve')}</Block>
      </dl>
    </Section>
  )
}
