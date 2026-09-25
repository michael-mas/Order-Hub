/**
 * Single source of career facts for every surface (page, CV, metadata).
 * Derived from docs/PARCOURS.md — edit that document first, then this file.
 * Durations are never stored: they are computed from dates at render time.
 */
import { z } from 'zod'

const isoMonth = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])(-\d{2})?$/, 'expected YYYY-MM or YYYY-MM-DD')

export const positionSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  start: isoMonth,
  end: isoMonth.nullable(),
})

export const skillSchema = z.object({
  name: z.string().min(1),
  group: z.enum(['production', 'rendering']),
  /** Where and for what — never a definition of the technology. */
  usage: z.string().min(1),
  proof: z.string().min(1),
})

export const pathStepSchema = z.object({
  period: z.string().min(1),
  label: z.string().min(1),
})

export const profileSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  location: z.string().min(1),
  status: z.string().min(1),
  email: z.email(),
  links: z.object({
    github: z.url(),
    linkedin: z.url(),
  }),
  positions: z.array(positionSchema).min(1),
  /** Before Lengow, condensed for display. Full detail lives in docs/PARCOURS.md. */
  earlierPath: z.array(pathStepSchema),
  education: z.array(z.string().min(1)),
  skills: z.array(skillSchema).max(10),
})

export type Position = z.infer<typeof positionSchema>
export type Profile = z.infer<typeof profileSchema>
export type Skill = z.infer<typeof skillSchema>

export const profile = profileSchema.parse({
  name: 'Michael Mas',
  headline: 'Développeur full stack — PHP/Symfony et React/TypeScript, intégrations e-commerce',
  location: 'Nantes · hybride ou remote',
  status: 'En recherche active',
  email: 'masmichael280699@gmail.com',
  links: {
    github: 'https://github.com/michael-mas',
    linkedin: 'https://www.linkedin.com/in/michaelmasdev',
  },
  positions: [
    { title: 'Software Developer', company: 'Lengow', start: '2023-10-01', end: null },
    {
      title: 'Software Support Developer',
      company: 'Lengow',
      start: '2022-09-06',
      end: '2023-09-30',
    },
  ],
  earlierPath: [
    {
      period: '2021 – 2022',
      label: 'Formation Développeur web et web mobile (AFPA) — bloc front-end validé',
    },
    { period: '2020 – 2021', label: 'Support technicien informatique (helpdesk)' },
    {
      period: '2012 – 2020',
      label: "Métiers de service et d'aide : restauration, bar-tabac, aide à domicile",
    },
  ],
  education: ['Bac pro commerce'],
  skills: [
    {
      name: 'PHP · Symfony',
      group: 'production',
      usage: 'Plugins CMS et services Lengow, de PHP 7 à 8.4 et de Symfony 4 à 7.',
      proof: 'Production — code propriétaire, détail en entretien',
    },
    {
      name: 'React · TypeScript',
      group: 'production',
      usage: 'Front React de la solution qui pilote la configuration des plugins et applications.',
      proof: 'Production — et le code de ce site',
    },
    {
      name: 'Intégrations e-commerce',
      group: 'production',
      usage:
        'Plugins et applications PrestaShop, Magento 1 et 2, WooCommerce, Shopware 5 et 6, Shopify ; exports catalogue et imports de commandes via les API des plateformes.',
      proof: 'Études de cas ci-dessus',
    },
    {
      name: 'Tests · PHPUnit · Vitest · Playwright',
      group: 'production',
      usage: 'Unitaires, intégration et bout en bout, exécutés à chaque PR.',
      proof: 'Production — et la CI de ce site',
    },
    {
      name: 'Datadog',
      group: 'production',
      usage: 'Dashboards de monitoring, alertes, exploration de logs pour diagnostiquer.',
      proof: 'Production — détail en entretien',
    },
    {
      name: 'PostgreSQL',
      group: 'production',
      usage: 'Requêtes courantes, lecture et investigation des données de production.',
      proof: 'Production — détail en entretien',
    },
    {
      name: 'Docker',
      group: 'production',
      usage: 'Environnements de développement et de test locaux.',
      proof: 'Production',
    },
    {
      name: 'Three.js · WebGL2 · GLSL',
      group: 'rendering',
      usage: 'Scénographie de ce site et expérience 3D System://Alive, shaders écrits à la main.',
      proof: 'Code public',
    },
  ],
} satisfies Profile)

/** Whole months elapsed between two ISO dates (day of month ignored). */
export function monthsBetween(start: string, end: string): number {
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  if (sy === undefined || sm === undefined || ey === undefined || em === undefined) {
    throw new Error(`invalid ISO date: ${start} / ${end}`)
  }
  return (ey - sy) * 12 + (em - sm)
}
