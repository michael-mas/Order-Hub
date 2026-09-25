import type { Profile } from '@/content/profile'

/** schema.org Person, built from profile.ts only. */
export function PersonJsonLd({ profile }: { profile: Profile }) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    jobTitle: profile.positions[0]?.title,
    description: profile.headline,
    email: `mailto:${profile.email}`,
    address: { '@type': 'PostalAddress', addressLocality: 'Nantes', addressCountry: 'FR' },
    sameAs: [profile.links.linkedin, profile.links.github],
    knowsAbout: profile.skills.map((s) => s.name),
  }
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output from our own data; `<` escaped so it cannot close the tag.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
