import { PersonJsonLd } from '@/components/PersonJsonLd'
import { ScenePortal } from '@/components/ScenePortal'
import { SiteFooter } from '@/components/SiteFooter'
import { SiteHeader } from '@/components/SiteHeader'
import { CaseStudy } from '@/components/sections/CaseStudy'
import { Contact } from '@/components/sections/Contact'
import { Experience } from '@/components/sections/Experience'
import { Hero } from '@/components/sections/Hero'
import { Path } from '@/components/sections/Path'
import { Skills } from '@/components/sections/Skills'
import { TwoHalves } from '@/components/sections/TwoHalves'
import { profile } from '@/content/profile'

export default function HomePage() {
  return (
    <>
      <a
        href="#travail"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-30 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Aller au contenu
      </a>
      <PersonJsonLd profile={profile} />
      <ScenePortal />
      <SiteHeader name={profile.name} />
      <main>
        <Hero profile={profile} />
        <TwoHalves halves={profile.halves} />
        <div id="travail">
          <CaseStudy
            id="cas-plugins"
            index={2}
            label="Étude de cas · production"
            study={profile.cases.find((c) => c.id === 'cas-plugins')}
            fallbackTitle="Reprendre un périmètre plugins sans passation"
            act="flow"
            source="réponse de Michael attendue"
            proofExpected={false}
          />
          <CaseStudy
            id="cas-commandes"
            index={3}
            label="Étude de cas · production"
            study={profile.cases.find((c) => c.id === 'cas-commandes')}
            fallbackTitle="Centraliser l'import des commandes"
            act="flow"
            source="PARCOURS.md § 4, cas B"
            proofExpected={false}
          />
          <CaseStudy
            id="cas-system-alive"
            index={4}
            label="Étude de cas · rendu temps réel"
            study={profile.cases.find((c) => c.id === 'cas-system-alive')}
            fallbackTitle="System://Alive"
            act="structure"
            source="lien vers l'expérience"
            proofExpected
          />
        </div>
        <Experience profile={profile} />
        <Skills skills={profile.skills} />
        <Path profile={profile} />
        <Contact profile={profile} />
      </main>
      <SiteFooter profile={profile} />
    </>
  )
}
