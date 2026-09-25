import type { Skill } from '@/content/profile'
import { Section } from '../Section'

const GROUPS: Array<{ key: Skill['group']; title: string }> = [
  { key: 'production', title: 'Développement' },
  { key: 'rendering', title: '3D dans le navigateur' },
]

export function Skills({ skills }: { skills: readonly Skill[] }) {
  return (
    <Section id="competences" index={6} label="Compétences" title="Ce que je pratique" act="skills">
      <div className="grid max-w-[68ch] gap-10">
        {GROUPS.map((group) => (
          <div key={group.key}>
            <h3 className="label-mono mb-3 text-text-faint">{group.title}</h3>
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
