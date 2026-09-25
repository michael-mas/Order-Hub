/**
 * Four quality tiers. `off` is a normal case, not a failure: the page is
 * complete without 3D. Degradation is a parameter, never a code branch.
 */
import type { Capabilities } from './capabilities'

export const TIERS = ['off', 'low', 'medium', 'high'] as const
export type Tier = (typeof TIERS)[number]

export interface TierBudget {
  maxDpr: number
  /** Hard cap on drawn pixels, w·h·dpr². */
  maxPixels: number
  fpsCap: number
  /** Median frame time above which the governor demotes, ms. */
  frameBudgetMs: number
  particles: number
  antialias: boolean
}

export const TIER_BUDGETS: Record<Exclude<Tier, 'off'>, TierBudget> = {
  low: {
    maxDpr: 1.25,
    maxPixels: 2_500_000,
    fpsCap: 30,
    frameBudgetMs: 30,
    particles: 12_000,
    antialias: false,
  },
  medium: {
    maxDpr: 1.5,
    maxPixels: 5_000_000,
    fpsCap: 60,
    frameBudgetMs: 18,
    particles: 40_000,
    antialias: true,
  },
  high: {
    maxDpr: 1.75,
    maxPixels: 9_000_000,
    fpsCap: 60,
    frameBudgetMs: 18,
    particles: 60_000,
    antialias: true,
  },
}

const SLOW_NETWORKS = new Set(['slow-2g', '2g'])
const INTEGRATED_GPU = /intel|mali|adreno|powervr|apple gpu|swiftshader|llvmpipe|software/i

/** A-priori tier from a hardware probe. The governor may only lower it. */
export function estimateTier(caps: Capabilities): Tier {
  if (!caps.webgl2 || caps.reducedMotion || caps.saveData) return 'off'
  if (caps.effectiveType !== null && SLOW_NETWORKS.has(caps.effectiveType)) return 'off'
  if (caps.memoryGb !== null && caps.memoryGb <= 2) return 'off'
  if (caps.coarsePointer) return 'low'
  if (caps.cores !== null && caps.cores <= 4) return 'low'
  if (caps.gpuRenderer === null || INTEGRATED_GPU.test(caps.gpuRenderer)) return 'medium'
  return 'high'
}

/** One step down; `off` stays `off`. */
export function demote(tier: Tier): Tier {
  return TIERS[Math.max(0, TIERS.indexOf(tier) - 1)]!
}

/** Device pixel ratio to render at, honouring the tier cap and the pixel budget. */
export function renderDpr(
  tier: Exclude<Tier, 'off'>,
  deviceDpr: number,
  width: number,
  height: number,
): number {
  const budget = TIER_BUDGETS[tier]
  const byCap = Math.min(deviceDpr, budget.maxDpr)
  const byPixels = Math.sqrt(budget.maxPixels / Math.max(1, width * height))
  return Math.max(0.5, Math.min(byCap, byPixels))
}
