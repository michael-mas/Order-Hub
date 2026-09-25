import { Pending } from '../Pending'
import { Section } from '../Section'

/** Fixed template: title names the result; the eight blocks come in this order. */
const BLOCKS = [
  'Contexte',
  'Le problème',
  'La contrainte',
  'Les décisions',
  'Le résultat',
  'Ce que je ferais autrement',
  'Preuve',
] as const

interface CaseStudyProps {
  id: string
  index: number
  label: string
  title: string
  act: string
  source: string
}

export function CaseStudy({ id, index, label, title, act, source }: CaseStudyProps) {
  return (
    <Section id={id} index={index} label={label} title={title} act={act}>
      <dl className="grid max-w-[68ch] gap-6">
        {BLOCKS.map((block) => (
          <div key={block}>
            <dt className="label-mono text-text-faint">{block}</dt>
            <dd className="mt-2">
              <Pending kind="write">{`${block.toLowerCase()} — ${source}`}</Pending>
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
