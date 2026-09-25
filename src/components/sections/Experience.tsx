import type { Profile } from '@/content/profile'
import { Pending } from '../Pending'
import { Section } from '../Section'

export function Experience({ profile }: { profile: Profile }) {
  const url = profile.links.experience
  return (
    <Section
      id="experience"
      index={5}
      label="Projet phare"
      title="Ouvrir l’expérience"
      act="threshold"
    >
      <div className="max-w-[68ch] space-y-6">
        <p className="text-lead">
          System://Alive, le projet de l’étude de cas ci-dessus{'\u00a0'}: l’expérience 3D complète,
          sur desktop comme sur mobile.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={url}
            className="rounded-md bg-accent px-5 py-3 font-medium text-on-accent no-underline hover:bg-accent-hover"
          >
            Ouvrir l’expérience
          </a>
          <a href={`${url}/?webgpu`} className="text-sm">
            Le chemin WebGPU expérimental
          </a>
        </div>
        <ul className="label-mono space-y-2 text-text-faint">
          <li>Expérience interactive · desktop recommandé</li>
          <li>
            <Pending>
              durée d’un premier parcours, mesurée sur quelqu’un qui ne connaît pas le site
            </Pending>
          </li>
          <li>
            <Pending>domaine définitif de l’expérience</Pending>
          </li>
        </ul>
      </div>
    </Section>
  )
}
