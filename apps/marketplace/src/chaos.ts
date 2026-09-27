import { z } from 'zod'

const probability = z.number().min(0).max(1)

export const chaosSchema = z
  .object({
    /** Share of API calls answered with a 503. */
    errorRate: probability,
    latencyMs: z
      .object({
        min: z.number().int().min(0).max(10_000),
        max: z.number().int().min(0).max(10_000),
      })
      .refine((l) => l.min <= l.max, 'latencyMs.min must be <= latencyMs.max'),
    /** The merchant's plan: burst size and sustained rate. */
    rateLimit: z.object({
      capacity: z.number().int().min(1).max(1000),
      refillPerSecond: z.number().min(0.1).max(1000),
    }),
    /** Eventual consistency: a change reaches listings up to this late. */
    visibilityDelayMaxMs: z.number().int().min(0).max(120_000),
    webhooks: z.object({
      dropRate: probability,
      duplicateRate: probability,
      /** Random delivery delay; any value above zero reorders deliveries. */
      maxDelayMs: z.number().int().min(0).max(60_000),
    }),
    generation: z.object({
      ordersPerMinute: z.number().min(0).max(600),
      updatesPerMinute: z.number().min(0).max(600),
    }),
  })
  .strict()

export type Chaos = z.infer<typeof chaosSchema>

/** A partial update: every nested field is optional, unknown keys rejected. */
export const chaosPatchSchema = z
  .object({
    errorRate: probability,
    latencyMs: z
      .object({ min: z.number().int().min(0), max: z.number().int().min(0) })
      .strict()
      .partial(),
    rateLimit: z
      .object({ capacity: z.number().int().min(1), refillPerSecond: z.number().min(0.1) })
      .strict()
      .partial(),
    visibilityDelayMaxMs: z.number().int().min(0),
    webhooks: z
      .object({
        dropRate: probability,
        duplicateRate: probability,
        maxDelayMs: z.number().int().min(0),
      })
      .strict()
      .partial(),
    generation: z
      .object({ ordersPerMinute: z.number().min(0), updatesPerMinute: z.number().min(0) })
      .strict()
      .partial(),
  })
  .strict()
  .partial()

export type ChaosPatch = z.infer<typeof chaosPatchSchema>

export function applyPatch(current: Chaos, patch: ChaosPatch): Chaos {
  // Re-validated as a whole so a patch cannot produce an inconsistent config.
  return chaosSchema.parse({
    ...current,
    ...(patch.errorRate !== undefined && { errorRate: patch.errorRate }),
    ...(patch.visibilityDelayMaxMs !== undefined && {
      visibilityDelayMaxMs: patch.visibilityDelayMaxMs,
    }),
    latencyMs: { ...current.latencyMs, ...patch.latencyMs },
    rateLimit: { ...current.rateLimit, ...patch.rateLimit },
    webhooks: { ...current.webhooks, ...patch.webhooks },
    generation: { ...current.generation, ...patch.generation },
  })
}

export const PRESETS = {
  /** A well-behaved channel. */
  calm: {
    errorRate: 0,
    latencyMs: { min: 20, max: 80 },
    rateLimit: { capacity: 20, refillPerSecond: 5 },
    visibilityDelayMaxMs: 0,
    webhooks: { dropRate: 0, duplicateRate: 0, maxDelayMs: 0 },
    generation: { ordersPerMinute: 12, updatesPerMinute: 12 },
  },
  /** Sales peak: tight quota, slow answers, late listings, some duplicates. */
  busy: {
    errorRate: 0.05,
    latencyMs: { min: 100, max: 600 },
    rateLimit: { capacity: 5, refillPerSecond: 1 },
    visibilityDelayMaxMs: 8_000,
    webhooks: { dropRate: 0.1, duplicateRate: 0.2, maxDelayMs: 3_000 },
    generation: { ordersPerMinute: 60, updatesPerMinute: 60 },
  },
  /** Everything that can go wrong, at once. */
  storm: {
    errorRate: 0.3,
    latencyMs: { min: 200, max: 1_500 },
    rateLimit: { capacity: 3, refillPerSecond: 0.5 },
    visibilityDelayMaxMs: 20_000,
    webhooks: { dropRate: 0.35, duplicateRate: 0.4, maxDelayMs: 10_000 },
    generation: { ordersPerMinute: 90, updatesPerMinute: 90 },
  },
} as const satisfies Record<string, Chaos>

export type PresetName = keyof typeof PRESETS
export const isPresetName = (name: string): name is PresetName => name in PRESETS
