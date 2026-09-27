/**
 * Seeded pseudo-random generator (mulberry32). Every fault the simulator
 * injects comes from here, so a scenario replays identically from its seed.
 */
export interface Random {
  /** Uniform float in [0, 1). */
  next(): number
  /** Uniform integer in [min, max], both inclusive. */
  int(min: number, max: number): number
  /** True with probability `p` (clamped to [0, 1]). */
  chance(p: number): boolean
  pick<T>(items: readonly T[]): T
}

export function createRandom(seed: number): Random {
  let state = seed >>> 0

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  return {
    next,
    int(min, max) {
      if (max < min) throw new RangeError(`int(${min}, ${max}): max < min`)
      return min + Math.floor(next() * (max - min + 1))
    },
    chance(p) {
      if (p <= 0) return false
      if (p >= 1) return true
      return next() < p
    },
    pick(items) {
      if (items.length === 0) throw new RangeError('pick() on an empty list')
      return items[Math.floor(next() * items.length)] as (typeof items)[number]
    },
  }
}
