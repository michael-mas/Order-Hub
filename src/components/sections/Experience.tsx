import { Pending } from '../Pending'
import { Section } from '../Section'

export function Experience() {
  return (
    <Section
      id="experience"
      index={5}
      label="Projet phare"
      title="Ouvrir l'expérience"
      act="threshold"
    >
      <div className="max-w-[68ch] space-y-4">
        <p className="text-text-muted">
          <Pending kind="write">
            présentation de l&apos;expérience System://Alive, reliée au cas ci-dessus
          </Pending>
        </p>
        <p className="label-mono text-text-faint">
          <Pending>
            durée réelle d&apos;un premier parcours, mesurée sur quelqu&apos;un qui ne connaît pas
            le site
          </Pending>
        </p>
        <p>
          <Pending>URL définitive de l&apos;expérience et lien de retour vers ce site</Pending>
        </p>
      </div>
    </Section>
  )
}
