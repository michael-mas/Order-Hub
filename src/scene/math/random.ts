/**
 * Seeded pseudo-random generator (mulberry32). Every procedural value in the
 * scene comes from here with an explicit seed, so a scene is identical on
 * every load and can be captured and tested. `Math.random` is banned in
 * `src/scene` by lint.
 */
export type Random = () => number

export function createRandom(seed: number): Random {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Uniform value in [min, max). */
export function range(random: Random, min: number, max: number): number {
  return min + (max - min) * random()
}
