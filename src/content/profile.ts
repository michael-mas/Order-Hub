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

export const halfSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  facts: z.array(z.string().min(1)).length(3),
  href: z.string().startsWith('#'),
})

export const profileSchema = z.object({
  name: z.string().min(1),
  headline: z.string().min(1),
  /** Second line of the hero: what the headline means, in one sentence. */
  tagline: z.string().min(1),
  halves: z.tuple([halfSchema, halfSchema]),
  location: z.string().min(1),
  status: z.string().min(1),
  email: z.email(),
  links: z.object({
    github: z.url(),
    linkedin: z.url(),
    /** The deployed 3D experience (System://Alive). Its code stays private. */
    experience: z.url(),
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
  headline: 'Développeur full stack — PHP/Symfony et React/TypeScript, intégrations e‑commerce',
  tagline:
    'Je développe des intégrations e‑commerce — catalogues, commandes, marketplaces — et des expériences 3D dans le navigateur.',
  halves: [
    {
      title: 'Intégrations e‑commerce',
      summary:
        'Relier les boutiques des marchands aux marketplaces : catalogues, commandes, plugins.',
      facts: [
        'PHP/Symfony et React/TypeScript, en production',
        'PrestaShop, Magento, WooCommerce, Shopware, Shopify — et les API des marketplaces',
        'Tests à chaque PR, surveillance et diagnostic dans Datadog',
      ],
      href: '#cas-plugins',
    },
    {
      title: '3D dans le navigateur',
      summary: 'Un portfolio 3D construit seul, et la scène de ce site.',
      facts: [
        'WebGL2 et shaders GLSL écrits à la main',
        'Un chemin WebGPU exploré jusqu’au bout — et gardé en option',
        'Une scène pilotée par le scroll, dont le placement est testé sans GPU',
      ],
      href: '#cas-system-alive',
    },
  ],
  location: 'Nantes · hybride ou remote',
  status: 'En recherche active',
  email: 'masmichael280699@gmail.com',
  links: {
    github: 'https://github.com/michael-mas',
    linkedin: 'https://www.linkedin.com/in/michaelmasdev',
    experience: 'https://personnal-portfolio-test77.vercel.app',
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
      usage: 'Plugins CMS et services back‑end, de PHP 7 à 8.4 et de Symfony 4 à 7.',
      proof: 'En production',
    },
    {
      name: 'React · TypeScript',
      group: 'production',
      usage: 'Front React de la solution qui pilote la configuration des plugins et applications.',
      proof: 'En production — et le code de ce site',
    },
    {
      name: 'Intégrations e‑commerce',
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
      proof: 'Ce site et l’expérience en ligne',
    },
  ],
  cases: [
    {
      id: 'cas-plugins',
      title: 'Des intégrations qui tiennent sur des plateformes qu’on ne contrôle pas',
      context:
        'J’ai pris en charge les plugins et applications qui relient les boutiques des marchands à une plateforme SaaS e‑commerce : PrestaShop, Magento 1 et 2, WooCommerce, Shopware 5 et 6, Shopify — exports catalogue, imports de commandes, actions de commande.',
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
    {
      id: 'cas-system-alive',
      title: 'System://Alive — deux chemins de rendu, et celui que j’ai choisi de ne pas servir',
      context:
        'Un portfolio 3D construit seul : une expérience desktop en React Three Fiber, une expérience mobile en Three.js, des shaders écrits à la main. C’est le projet où je décide de tout, du rendu au déploiement.',
      problem:
        'Je voulais un vrai chemin WebGPU, avec des matériaux en TSL. Deux crashs sont apparus : des matériaux créés pendant le rendu React entraient en concurrence avec l’envoi des buffers de la première frame (setIndexBuffer), et une géométrie recréée à chaque changement de texte provoquait la même erreur en cours de frame. Sur les écrans ultra-larges à haute densité, le canvas dépassait aussi la taille de texture maximale du GPU.',
      constraint:
        'La direction artistique existait déjà en GLSL et fonctionnait : la porter en TSL, c’était réécrire un rendu validé. Et un portfolio n’a pas de version suivante : un crash chez un recruteur ne se rattrape pas.',
      decisions: [
        {
          choice:
            'Construire les matériaux TSL après la première frame, dans un effet, avec un matériau simple en repli le temps d’une frame.',
          rejected: 'Attendre un correctif dans Three.js.',
          why: 'Le bug était intermittent, et le calendrier ne dépendait pas de moi.',
        },
        {
          choice:
            'Une géométrie unitaire, mise à l’échelle par la matrice du mesh, plutôt qu’une géométrie recréée aux dimensions du texte.',
          rejected: 'Recréer la géométrie à chaque changement.',
          why: 'Chaque recréation réalloue les buffers en cours de frame.',
        },
        {
          choice:
            'Calculer la densité de pixels à partir de la taille réelle de l’écran, pour que le canvas reste sous la limite du GPU.',
          rejected: 'Un plafond de densité fixe.',
          why: 'Il aurait dégradé tout le monde, ou continué à casser les écrans ultra-larges.',
        },
        {
          choice: 'Servir WebGL à tous, et n’ouvrir WebGPU qu’avec le paramètre ?webgpu.',
          rejected: 'Livrer WebGPU par défaut, plus impressionnant à raconter.',
          why: 'Des portages restaient incomplets : un visiteur aurait pu tomber sur une zone vide ou un crash.',
        },
      ],
      result:
        'Les deux chemins fonctionnent ; les visiteurs reçoivent le chemin WebGL, et WebGPU reste ouvrable. Deux bugs dépendants du framerate m’ont laissé une règle que j’applique depuis : toute logique qui dépend de la durée d’une frame est un bug en attente d’une machine plus lente. Ce site en hérite directement, avec un lissage borné et testé.',
      differently:
        'Je partirais avec des tests et une intégration continue dès le premier jour — c’est ce que fait ce site.',
      proof: 'L’expérience elle-même, en ligne — le code reste privé.',
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
