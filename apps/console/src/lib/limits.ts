/**
 * Global token buckets for the actions the public console relays. They bound
 * the work anyone can cause (model calls, generated orders, replays, full
 * consistency checks), not who gets it: volumetric protection belongs to the
 * edge in front of the demo.
 */
export type Limit = 'analysis' | 'consistency' | 'operation' | 'chaos' | 'generate'

export interface BucketConfig {
  capacity: number
  /** Time to earn back one token; 0 disables the bucket. */
  refillMs: number
}

export const DEFAULT_LIMITS: Readonly<Record<Limit, BucketConfig>> = {
  analysis: { capacity: 1, refillMs: 15_000 },
  consistency: { capacity: 3, refillMs: 3_000 },
  operation: { capacity: 10, refillMs: 2_000 },
  chaos: { capacity: 10, refillMs: 2_000 },
  generate: { capacity: 3, refillMs: 20_000 },
}

export interface Bucket {
  /** Returns 0 when allowed (and spends a token), else the ms to wait. */
  take(): number
}

export function createBucket(config: BucketConfig, now: () => number = Date.now): Bucket {
  if (config.refillMs <= 0) return { take: () => 0 }
  let tokens = config.capacity
  let updatedAt = now()
  return {
    take() {
      const at = now()
      tokens = Math.min(config.capacity, tokens + (at - updatedAt) / config.refillMs)
      updatedAt = at
      if (tokens >= 1) {
        tokens -= 1
        return 0
      }
      return Math.ceil((1 - tokens) * config.refillMs)
    },
  }
}

export interface Limiter {
  take(limit: Limit): number
}

export function createLimiter(
  configs: Readonly<Record<Limit, BucketConfig>> = DEFAULT_LIMITS,
  now: () => number = Date.now,
): Limiter {
  const buckets = new Map<Limit, Bucket>()
  for (const [limit, config] of Object.entries(configs) as [Limit, BucketConfig][]) {
    buckets.set(limit, createBucket(config, now))
  }
  return { take: (limit) => buckets.get(limit)?.take() ?? 0 }
}

/**
 * The defaults, with the analysis interval overridable
 * (`ANALYSIS_COOLDOWN_MS`, 0 in the end-to-end stack that analyses twice).
 */
export function limitsFromEnv(
  env: Readonly<Record<string, string | undefined>>,
): Record<Limit, BucketConfig> {
  const limits = { ...DEFAULT_LIMITS }
  const cooldown = Number(env.ANALYSIS_COOLDOWN_MS)
  if (env.ANALYSIS_COOLDOWN_MS !== undefined && Number.isFinite(cooldown) && cooldown >= 0) {
    limits.analysis = { capacity: 1, refillMs: cooldown }
  }
  return limits
}
