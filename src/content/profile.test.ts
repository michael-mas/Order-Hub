import { describe, expect, it } from 'vitest'
import { monthsBetween, profile, profileSchema } from './profile'

describe('profile', () => {
  it('matches its schema', () => {
    expect(() => profileSchema.parse(profile)).not.toThrow()
  })

  it('lists positions newest first, without overlap', () => {
    const [current, previous] = profile.positions
    expect(current?.end).toBeNull()
    expect(previous?.end).not.toBeNull()
    expect(previous!.end! < current!.start).toBe(true)
  })

  it('never uses a title that was never held', () => {
    const text = JSON.stringify(profile).toLowerCase()
    for (const banned of ['lead', 'senior', 'freelance', 'autodidacte']) {
      expect(text).not.toContain(banned)
    }
  })
})

describe('case studies', () => {
  // Measured figures only: percentages, durations, counted quantities. Product
  // versions ("Magento 1 et 2") are names, not figures. A before/after pair is
  // one comparison, hence the limit of two matches.
  const UNIT =
    '(?:mois|semaines?|jours?|ans?|heures?|minutes?|commandes?|tickets?|marchands?|ms|Mo|kB|%)'
  const SPELLED =
    '(?:un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\\s(?:mois|semaines?|jours?|ans?|heures?)'
  const figure = new RegExp(`\\b\\d+(?:[.,]\\d+)?\\s?${UNIT}|\\b${SPELLED}\\b`, 'gi')
  const countNumbers = (text: string) => (text.match(figure) ?? []).length

  it('use a no-break space before French double punctuation', () => {
    expect(JSON.stringify(profile)).not.toMatch(/ [:;?!]/)
  })

  it('never name a client, an account or an order', () => {
    const text = JSON.stringify(profile.cases)
    expect(text).not.toMatch(/order_id|MARCHAND_[A-Z]|@|https?:\/\//)
  })

  it('the figure counter catches real figures and ignores product versions', () => {
    expect(countNumbers('Magento 1 et 2, Shopware 5 et 6, un marchand')).toBe(0)
    expect(countNumbers('un mois accordé, livré en deux semaines')).toBe(2)
    expect(countNumbers('de 12 % à 0,1 %, et 398 tickets')).toBe(3)
  })

  it('carry at most one figure each, in a sentence (decided by Michael)', () => {
    for (const c of profile.cases) {
      const numbers = countNumbers(JSON.stringify({ ...c, id: '', title: '' }))
      expect(numbers, c.id).toBeLessThanOrEqual(2)
    }
  })
})

describe('monthsBetween', () => {
  it('counts whole months', () => {
    expect(monthsBetween('2022-09-06', '2023-10-01')).toBe(13)
    expect(monthsBetween('2022-09', '2022-09')).toBe(0)
  })
})
