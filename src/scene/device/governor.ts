/**
 * Measures real frame times and demotes the tier when the median of a window
 * misses its budget. Never promotes: an oscillating tier rebuilds materials on
 * every transition and looks worse than a tier that is too low.
 */
import { TIER_BUDGETS, demote, type Tier } from './tiers'

export interface Governor {
  readonly tier: Tier
  /** Feeds one frame duration (ms). Returns the new tier when it just changed. */
  record(frameMs: number): Tier | null
}

export function createGovernor(initial: Tier, windowSize = 120): Governor {
  let tier = initial
  let samples: number[] = []

  return {
    get tier() {
      return tier
    },
    record(frameMs) {
      if (tier === 'off' || !Number.isFinite(frameMs) || frameMs <= 0) return null
      samples.push(frameMs)
      if (samples.length < windowSize) return null
      const median = [...samples].sort((a, b) => a - b)[Math.floor(samples.length / 2)]!
      samples = []
      if (median <= TIER_BUDGETS[tier].frameBudgetMs) return null
      tier = demote(tier)
      return tier
    },
  }
}
