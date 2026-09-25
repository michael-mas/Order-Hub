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

export const decisionSchema = z.object({
  choice: z.string().min(1),
  rejected: z.string().min(1),
  why: z.string().min(1),
})

/** Case study, fixed template. `null` means "not supplied yet" and renders a visible marker. */
export const caseStudySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  context: z.string().min(1).nullable(),
  problem: z.string().min(1).nullable(),
  constraint: z.string().min(1).nullable(),
  decisions: z.array(decisionSchema).max(4),
  result: z.string().min(1).nullable(),
  differently: z.string().min(1).nullable(),
  /**
   * Public proof only (a repository, a live page). `null` for employer work:
   * Michael keeps a deliberate distance from his employer's code (2026-09-25),
   * so the block is omitted, not marked as missing.
   */
  proof: z.string().min(1).nullable(),
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
  cases: z.array(caseStudySchema),
})

export type Position = z.infer<typeof positionSchema>
export type Profile = z.infer<typeof profileSchema>
export type Skill = z.infer<typeof skillSchema>
export type CaseStudy = z.infer<typeof caseStudySchema>

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
      label: "Métiers de service et d'aide : restauration, bar-tabac, aide à domicile",
    },
  ],
  education: ['Bac pro commerce'],
  skills: [
    {
      name: 'PHP · Symfony',
      group: 'production',
      usage: 'Plugins CMS et services Lengow, de PHP 7 à 8.4 et de Symfony 4 à 7.',
      proof: 'En production',
    },
    {
      name: 'React · TypeScript',
      group: 'production',
      usage: 'Front React de la solution qui pilote la configuration des plugins et applications.',
      proof: 'En production — et le code de ce site',
    },
    {
      name: 'Intégrations e-commerce',
      group: 'production',
      usage:
        'Plugins et applications PrestaShop, Magento 1 et 2, WooCommerce, Shopware 5 et 6, Shopify ; exports catalogue et imports de commandes via les API des plateformes.',
      proof: 'Études de cas ci-dessus',
    },
    {
      name: 'Tests · PHPUnit · Vitest · Playwright',
      group: 'production',
      usage: 'Unitaires, intégration et bout en bout, exécutés à chaque PR.',
      proof: 'En production — et la CI de ce site',
    },
    {
      name: 'Datadog',
      group: 'production',
      usage: 'Dashboards de monitoring, alertes, exploration de logs pour diagnostiquer.',
      proof: 'En production',
    },
    {
      name: 'PostgreSQL',
      group: 'production',
      usage: 'Requêtes courantes, lecture et investigation des données de production.',
      proof: 'En production',
    },
    {
      name: 'Docker',
      group: 'production',
      usage: 'Environnements de développement et de test locaux.',
      proof: 'En production',
    },
    {
      name: 'Three.js · WebGL2 · GLSL',
      group: 'rendering',
      usage: 'Scénographie de ce site et expérience 3D System://Alive, shaders écrits à la main.',
      proof: 'Code public',
    },
  ],
  cases: [
    {
      id: 'cas-plugins',
      title: 'Reprendre un périmètre d’intégrations sans passation, et le stabiliser',
      context:
        'À mon arrivée chez Lengow, comme Software Support Developer, j’ai reçu les dépôts des plugins et des applications, et la file de support qui allait avec — sans passation. Le périmètre : PrestaShop, Magento 1 et 2, WooCommerce, Shopware 5 et 6, Shopify.',
      problem:
        'Des imports de commandes échouaient, certains exports catalogue aussi, et plusieurs plugins avaient pris du retard sur les nouvelles versions des CMS. Chaque ticket touchait une plateforme que je devais d’abord apprendre à installer et à faire tourner.',
      constraint:
        'Tout arrivait en même temps, sans historique ni personne à qui demander. Les erreurs dépendaient de l’environnement du marchand — version de PHP, configuration du serveur, taille du catalogue — que je ne contrôlais pas, et les tableaux de bord des éditeurs ne gardaient guère plus qu’un code d’erreur.',
      decisions: [
        {
          choice: 'Les problèmes qui touchaient les marchands d’abord, la compatibilité ensuite.',
          rejected: 'Rattraper d’abord les retards de compatibilité.',
          why: 'Un marchand dont les commandes ne remontent plus est un marchand qui s’en va.',
        },
        {
          choice:
            'Une exception : l’application Shopify passée en tête dès l’avertissement de retrait pour non-conformité — API dépréciée et taux d’erreur élevé sur les webhooks. Un mois accordé ; livré en deux semaines, sans avoir jamais touché Shopify, avec une relance de leur support pour accélérer la revue.',
          rejected: 'Appliquer la règle de priorité sans exception.',
          why: 'Le retrait menaçait l’application entière, pas un marchand.',
        },
        {
          choice:
            'Diagnostiquer de mon côté : logs des plugins, reproduction locale, puis Datadog.',
          rejected: 'S’appuyer sur les tableaux de bord partenaires des éditeurs.',
          why: 'Rétention courte, et guère plus qu’un code d’erreur.',
        },
        {
          choice:
            'Rendre les plugins rétrocompatibles sur une plage de versions, et déprécier au fur et à mesure celles que les éditeurs eux-mêmes ne supportaient plus.',
          rejected: 'Maintenir toutes les versions indéfiniment.',
          why: 'Les éditeurs eux-mêmes ne les maintenaient plus.',
        },
      ],
      result:
        'Plus d’erreur liée à ces causes racines, et une surveillance pour repérer les nouvelles. L’urgence passée, j’ai remboursé la dette — tests PHPUnit, Vitest et Playwright, exécutés à chaque PR — puis transmis le périmètre au développeur arrivé ensuite, avec la documentation qui manquait à mon arrivée.',
      differently: null,
      proof: null,
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
