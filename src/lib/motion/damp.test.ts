import { describe, expect, it } from 'vitest'
import { MAX_DT, clampDt, damp, dampFactor } from './damp'

describe('clampDt', () => {
  it('caps long frames at MAX_DT', () => {
    expect(clampDt(5)).toBe(MAX_DT)
  })

  it('maps negative and non-finite deltas to 0', () => {
    expect(clampDt(-1)).toBe(0)
    expect(clampDt(Number.NaN)).toBe(0)
    expect(clampDt(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('dampFactor', () => {
  it('stays in [0, 1) for any delta, including a returning background tab', () => {
    for (const dt of [0, 1 / 240, 1 / 60, 1 / 30, 0.2, 1, 60, 1e9]) {
      const k = dampFactor(dt, 12)
      expect(k).toBeGreaterThanOrEqual(0)
      expect(k).toBeLessThan(1)
    }
  })

  it('is frame-rate independent: two half steps equal one full step', () => {
    const lambda = 8
    const dt = 1 / 30
    const full = damp(0, 1, lambda, dt)
    const halves = damp(damp(0, 1, lambda, dt / 2), 1, lambda, dt / 2)
    expect(halves).toBeCloseTo(full, 12)
  })

  it('returns 0 for a non-positive decay rate', () => {
    expect(dampFactor(1 / 60, 0)).toBe(0)
    expect(dampFactor(1 / 60, -3)).toBe(0)
  })
})

describe('damp', () => {
  it('approaches the target monotonically without overshooting', () => {
    let value = 0
    for (let i = 0; i < 500; i++) {
      const next = damp(value, 1, 10, 1 / 60)
      expect(next).toBeGreaterThanOrEqual(value)
      expect(next).toBeLessThanOrEqual(1)
      value = next
    }
    expect(value).toBeCloseTo(1, 6)
  })
})
