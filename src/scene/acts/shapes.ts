/**
 * Procedural point sets. Pure functions `(count, random, size) => Float32Array`
 * of xyz triplets, local to a box of `size` centred on the origin — the same
 * box the layout declares, so spatial tests cover what is drawn.
 * Zero bytes of geometry are downloaded.
 */
import type { Random } from '../math/random'

export type Size3 = readonly [number, number, number]

/**
 * An ordered flow: particles on parallel lanes that run along X, with a gentle
 * vertical wave. Reads as data moving in one direction.
 */
export function flowLanes(count: number, random: Random, size: Size3, lanes = 14): Float32Array {
  const [w, h, d] = size
  const out = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const lane = i % lanes
    const t = random()
    const laneY = ((lane + 0.5) / lanes - 0.5) * h * 0.8
    const x = (t - 0.5) * w
    const wave = Math.sin(t * Math.PI * 2 + lane) * h * 0.04
    out[i * 3] = x
    out[i * 3 + 1] = clamp(laneY + wave + (random() - 0.5) * h * 0.02, h / 2)
    out[i * 3 + 2] = (random() - 0.5) * d * 0.9
  }
  return out
}

/**
 * A computed structure: points gathered around the nodes and along the edges
 * of a cubic lattice. Reads as something calculated.
 */
export function lattice(count: number, random: Random, size: Size3, cells = 4): Float32Array {
  const out = new Float32Array(count * 3)
  const step = size.map((s) => s / cells) as [number, number, number]
  for (let i = 0; i < count; i++) {
    const node = [0, 1, 2].map(() => Math.floor(random() * (cells + 1)))
    const axis = Math.floor(random() * 3)
    const along = random() < 0.35 ? 0 : random()
    for (let a = 0; a < 3; a++) {
      const base = node[a]! * step[a]! - size[a]! / 2
      const offset = a === axis && node[a]! < cells ? along * step[a]! : 0
      const jitter = (random() - 0.5) * step[a]! * 0.04
      out[i * 3 + a] = clamp(base + offset + jitter, size[a]! / 2)
    }
  }
  return out
}

/** Per-point random seed in [0, 1), used by the shaders for speed and size variation. */
export function seeds(count: number, random: Random): Float32Array {
  const out = new Float32Array(count)
  for (let i = 0; i < count; i++) out[i] = random()
  return out
}

function clamp(v: number, half: number): number {
  return v < -half ? -half : v > half ? half : v
}
