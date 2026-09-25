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
      title: 'Des intégrations qui tiennent sur des plateformes qu’on ne contrôle pas',
      context:
        'J’ai pris en charge les plugins et applications qui relient les boutiques des marchands à une plateforme SaaS e-commerce : PrestaShop, Magento 1 et 2, WooCommerce, Shopware 5 et 6, Shopify — exports catalogue, imports de commandes, actions de commande.',
      problem:
        'Ce code tourne sur les serveurs des marchands, pas sur les nôtres. Chaque plateforme a ses versions, ses API et ses règles de publication, et chacune évolue à son rythme.',
      constraint:
        'Les erreurs dépendent d’un environnement que je ne contrôle pas — version de PHP, configuration du serveur, taille du catalogue — et les tableaux de bord des éditeurs ne conservent guère plus qu’un code d’erreur. Chaque plateforme s’apprend en la faisant tourner soi-même.',
      decisions: [
        {
          choice: 'Traiter d’abord ce qui touche les marchands, la compatibilité ensuite.',
          rejected: 'L’ordre inverse.',
          why: 'Un marchand dont les commandes ne remontent pas ne peut pas attendre.',
        },
        {
          choice:
            'Une exception : une mise en conformité exigée par l’éditeur d’une plateforme — API dépréciée, taux d’erreur des webhooks — avec un mois de délai. Livrée en deux semaines, sans connaître la plateforme au départ, en sollicitant son support pour accélérer la revue.',
          rejected: 'Appliquer la règle sans exception.',
          why: 'L’enjeu dépassait un seul marchand.',
        },
        {
          choice:
            'Diagnostiquer de mon côté : logs des plugins, reproduction locale, puis Datadog.',
          rejected: 'S’appuyer sur les tableaux de bord des éditeurs.',
          why: 'Rétention courte, et guère plus qu’un code d’erreur.',
        },
        {
          choice:
            'Rendre les plugins rétrocompatibles sur une plage de versions, et déprécier au fur et à mesure celles que les éditeurs eux-mêmes ne supportent plus.',
          rejected: 'Maintenir toutes les versions indéfiniment.',
          why: 'Les éditeurs eux-mêmes ne les maintiennent plus.',
        },
      ],
      result:
        'Les erreurs liées à ces causes racines ne reviennent plus, et une surveillance repère les nouvelles. J’ai ensuite ajouté des tests PHPUnit, Vitest et Playwright exécutés à chaque PR, écrit la documentation technique du périmètre et formé le développeur qui m’a rejoint.',
      differently: null,
      proof: null,
    },
    {
      id: 'cas-commandes',
      title: 'Importer les commandes à temps, sans API de notification',
      context:
        'Un service en PHP/Symfony centralise la récupération des commandes et du catalogue pour l’ensemble des connecteurs. L’architecture a été choisie en équipe ; j’en ai écrit la parallélisation, la gestion des quotas, la migration des commandes, les connecteurs et les écrans de configuration.',
      problem:
        'Une grande fenêtre d’import, relancée régulièrement, pouvait dépasser le temps imparti chez les marchands les plus actifs. Les imports finissaient par se chevaucher, et une part des commandes arrivait en retard ou n’était pas mise à jour.',
      constraint:
        'Les marketplaces imposent leurs API : aucune notification quand une commande arrive, et des quotas d’appels qui varient selon le forfait de chaque marchand.',
      decisions: [
        {
          choice:
            'Se rapprocher au plus près d’un fonctionnement événementiel : une fenêtre d’import courte et fréquente pour la réactivité, plus un rattrapage quotidien sur plusieurs jours pour ne rien laisser passer.',
          rejected: 'Des notifications en temps réel par webhooks.',
          why: 'Les API des marketplaces ne les proposent pas.',
        },
        {
          choice:
            'Paralléliser le téléchargement du catalogue, en réglant le nombre d’appels sur le quota d’API propre au forfait de chaque marchand.',
          rejected: 'Un même nombre d’appels pour tous les marchands.',
          why: 'Chaque forfait a son propre quota.',
        },
        {
          choice:
            'Déplacer la logique d’un plugin lourd, installé chez chaque marchand, vers une intégration headless centralisée dans ce service — migration en cours.',
          rejected: 'Continuer à faire évoluer la logique dans le plugin.',
          why: 'Le code installé chez le marchand échappe aux logs et se débogue à l’aveugle.',
        },
      ],
      result:
        'Les commandes importées en retard ou non mises à jour ont quasiment disparu, ce que confirment Datadog et une requête SQL de contrôle. Avec des logs désormais conservés, un problème signalé le matin se diagnostique dans la journée.',
      differently:
        'J’aurais pris plus de temps au départ pour coller au plus près de l’architecture propre visée ; l’écart se résorbe depuis.',
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
