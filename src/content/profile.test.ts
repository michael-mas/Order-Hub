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

describe('monthsBetween', () => {
  it('counts whole months', () => {
    expect(monthsBetween('2022-09-06', '2023-10-01')).toBe(13)
    expect(monthsBetween('2022-09', '2022-09')).toBe(0)
  })
})
