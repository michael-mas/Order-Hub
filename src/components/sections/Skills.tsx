import type { Skill } from '@/content/profile'
import { Section } from '../Section'

const GROUPS: Array<{ key: Skill['group']; title: string }> = [
  { key: 'production', title: 'Production' },
  { key: 'rendering', title: 'Rendu temps réel' },
]

export function Skills({ skills }: { skills: readonly Skill[] }) {
  return (
    <Section id="competences" index={6} label="Compétences" title="Ce que je pratique" act="skills">
      <div className="grid gap-10 md:grid-cols-[1fr_2fr]">
        {GROUPS.map((group) => (
          <div key={group.key} className="contents">
            <h3 className="label-mono pt-1 text-text-faint">{group.title}</h3>
            <ul className="divide-y divide-border border-y border-border">
              {skills
                .filter((s) => s.group === group.key)
                .map((skill) => (
                  <li key={skill.name} className="grid gap-1 py-4">
                    <span className="font-semibold">{skill.name}</span>
                    <span className="text-text-muted">{skill.usage}</span>
                    <span className="label-mono text-text-faint">{skill.proof}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  )
}
