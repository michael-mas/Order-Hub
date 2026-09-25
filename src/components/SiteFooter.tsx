import type { Profile } from '@/content/profile'
import { Pending } from './Pending'

export function SiteFooter({ profile }: { profile: Profile }) {
  return (
    <footer className="border-t border-border bg-bg-sunken">
      <div className="mx-auto grid max-w-[1120px] gap-8 px-[var(--gutter)] py-12 text-sm md:grid-cols-3">
        <div>
          <p className="font-semibold">{profile.name}</p>
          <p className="mt-1 text-text-muted">{profile.headline}</p>
        </div>
        <ul className="space-y-2 text-text-muted">
          <li>
            <a href={`mailto:${profile.email}`}>{profile.email}</a>
          </li>
          <li>
            <a href={profile.links.linkedin}>LinkedIn</a>
          </li>
          <li>
            <a href={profile.links.github}>GitHub</a>
          </li>
          <li>
            CV PDF — <Pending kind="write">généré depuis profile.ts</Pending>
          </li>
        </ul>
        <ul className="label-mono space-y-3 text-text-faint">
          <li>
            System://Alive — expérience 3D <Pending>URL définitive</Pending>
          </li>
          <li>
            Code My Life <Pending>URL et durée du parcours</Pending>
          </li>
        </ul>
      </div>
      <p className="label-mono mx-auto max-w-[1120px] px-[var(--gutter)] pb-10 text-text-faint">
        Next.js · TypeScript strict · testé en CI
      </p>
    </footer>
  )
}
