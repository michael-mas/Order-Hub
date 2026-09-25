import { describe, expect, it } from 'vitest'
import { HERO_LAYOUT } from '../layout'
import { createRandom } from '../math/random'
import { coreSphere, flowLanes, lattice, seeds, type Size3 } from './shapes'

/** Shapes are generated in SHAPE_SCALE of the subject box, so the burst never leaves it. */
import { MAX_BURST, SHAPE_SCALE } from './subject'
const subject = HERO_LAYOUT.entries.find((e) => e.name === 'subject')!
const shapeBox = subject.size.map((v) => v * SHAPE_SCALE) as unknown as Size3
const sphereRadius = Math.hypot(...subject.size) / 2

/** Float32 storage rounds 0.8 to 0.800000012; allow that, nothing more. */
const FLOAT32_EPSILON = 1e-6

function withinBox(points: Float32Array, box: Size3): boolean {
  for (let i = 0; i < points.length; i++) {
    if (Math.abs(points[i]!) > box[i % 3]! / 2 + FLOAT32_EPSILON) return false
  }
  return true
}

describe.each([
  ['coreSphere', coreSphere, shapeBox],
  ['flowLanes', flowLanes, shapeBox],
  ['lattice', lattice, shapeBox],
] as const)('%s', (_name, generate, box) => {
  it('returns count xyz triplets with no NaN', () => {
    const points = generate(5000, createRandom(1), box)
    expect(points).toHaveLength(15000)
    expect(points.every(Number.isFinite)).toBe(true)
  })

  it('stays inside the volume the layout declares', () => {
    expect(withinBox(generate(20000, createRandom(2), box), box)).toBe(true)
  })

  it('stays inside the subject sphere even at the maximum burst', () => {
    const points = generate(20000, createRandom(5), box)
    let max = 0
    for (let i = 0; i < points.length; i += 3)
      max = Math.max(max, Math.hypot(points[i]!, points[i + 1]!, points[i + 2]!))
    expect(max * MAX_BURST).toBeLessThanOrEqual(sphereRadius + 1e-6)
  })

  it('is deterministic for a seed', () => {
    expect(generate(100, createRandom(9), box)).toEqual(generate(100, createRandom(9), box))
  })
})

describe('seeds', () => {
  it('produces one value per point in [0, 1)', () => {
    const s = seeds(1000, createRandom(4))
    expect(s).toHaveLength(1000)
    expect(s.every((v) => v >= 0 && v < 1)).toBe(true)
  })
})
