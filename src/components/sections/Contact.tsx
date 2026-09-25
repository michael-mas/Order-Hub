import type { Profile } from '@/content/profile'
import { CopyEmail } from '../CopyEmail'
import { ContactForm } from '../ContactForm'
import { Section } from '../Section'

export function Contact({ profile }: { profile: Profile }) {
  return (
    <Section id="contact" index={8} label="Contact" title="Me contacter" act="contact">
      <div className="max-w-[68ch] space-y-6">
        <p className="text-lead">
          {profile.status} · {profile.location}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <a href={`mailto:${profile.email}`} className="font-mono text-lead break-all">
            {profile.email}
          </a>
          <CopyEmail email={profile.email} />
        </div>
        <ul className="flex flex-wrap gap-6">
          <li>
            <a href={profile.links.linkedin}>LinkedIn</a>
          </li>
          <li>
            <a href={profile.links.github}>GitHub</a>
          </li>
        </ul>
        <ContactForm email={profile.email} />
      </div>
    </Section>
  )
}
