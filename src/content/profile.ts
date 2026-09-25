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
})

export type Position = z.infer<typeof positionSchema>
export type Profile = z.infer<typeof profileSchema>

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
