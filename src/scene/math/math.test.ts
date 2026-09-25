import { describe, expect, it } from 'vitest'
import { deg, toDeg } from './angles'
import { createRandom, range } from './random'

describe('deg', () => {
  it('converts degrees to radians', () => {
    expect(deg(180)).toBeCloseTo(Math.PI, 12)
    expect(deg(90)).toBeCloseTo(Math.PI / 2, 12)
    expect(toDeg(deg(37))).toBeCloseTo(37, 12)
  })
})

describe('createRandom', () => {
  it('is deterministic for a given seed', () => {
    const a = createRandom(42)
    const b = createRandom(42)
    for (let i = 0; i < 100; i++) expect(a()).toBe(b())
  })

  it('differs between seeds', () => {
    expect(createRandom(1)()).not.toBe(createRandom(2)())
  })

  it('stays in [0, 1) and is roughly uniform', () => {
    const random = createRandom(7)
    let sum = 0
    const n = 20_000
    for (let i = 0; i < n; i++) {
      const v = random()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
      sum += v
    }
    expect(sum / n).toBeCloseTo(0.5, 1)
  })

  it('range respects its bounds', () => {
    const random = createRandom(3)
    for (let i = 0; i < 1000; i++) {
      const v = range(random, -2, 5)
      expect(v).toBeGreaterThanOrEqual(-2)
      expect(v).toBeLessThan(5)
    }
  })
})
