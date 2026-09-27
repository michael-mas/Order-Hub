import { z } from 'zod'

export const severitySchema = z.enum(['info', 'warning', 'error'])
export type Severity = z.infer<typeof severitySchema>

export const journalEntrySchema = z.object({
  id: z.string(),
  occurred_at: z.string(),
  channel: z.string().nullable(),
  type: z.string(),
  severity: severitySchema,
  message: z.string(),
  context: z.record(z.string(), z.unknown()),
})
export type JournalEntry = z.infer<typeof journalEntrySchema>

export const journalPageSchema = z.object({
  entries: z.array(journalEntrySchema),
  last_id: z.string().nullable(),
})

export const channelSchema = z.object({
  code: z.string(),
  name: z.string(),
  supports_webhooks: z.boolean(),
  poll_interval_seconds: z.number(),
  paused: z.boolean(),
  throttled_until: z.string().nullable(),
  cursor: z.string().nullable(),
  reconciliation_in_progress: z.boolean(),
  last_poll_at: z.string().nullable(),
  last_poll_outcome: z.string().nullable(),
  orders: z.number(),
  acknowledged: z.number(),
  updated_last_5_min: z.number(),
})
export type Channel = z.infer<typeof channelSchema>

export const overviewSchema = z.object({
  generated_at: z.string(),
  orders: z.number(),
  acknowledged: z.number(),
  failed_messages: z.number(),
  events_last_15_min: z.record(z.string(), z.number()),
})
export type Overview = z.infer<typeof overviewSchema>

export const failedMessageSchema = z.object({
  id: z.string(),
  type: z.string(),
  channel: z.string().nullable(),
  order_id: z.string().nullable(),
  error: z.string(),
  attempts: z.number(),
  failed_at: z.string().nullable(),
})
export type FailedMessage = z.infer<typeof failedMessageSchema>

export const failedMessagesSchema = z.object({
  count: z.number(),
  messages: z.array(failedMessageSchema),
})

export const actionSchema = z.enum([
  'replay_failed_messages',
  'pause_channel',
  'resume_channel',
  'reconcile_channel',
  'none',
])
export type Action = z.infer<typeof actionSchema>

export const analysisSchema = z.object({
  engine: z.string(),
  fallback_reason: z.string().nullable(),
  level: z.enum(['ok', 'degraded', 'incident']),
  summary: z.string(),
  findings: z.array(
    z.object({ title: z.string(), explanation: z.string(), evidence: z.array(z.string()) }),
  ),
  recommendations: z.array(
    z.object({ action: actionSchema, channel: z.string().nullable(), rationale: z.string() }),
  ),
  discarded: z.number(),
  /** The journal entries the findings cite, even if no longer on screen. */
  evidence: z.array(journalEntrySchema.omit({ context: true })),
})
export type Analysis = z.infer<typeof analysisSchema>

export const orderSchema = z.object({
  id: z.string(),
  channel: z.string(),
  externalId: z.string(),
  status: z.string(),
  totalMinor: z.number(),
  currency: z.string(),
  version: z.number(),
  firstSource: z.string(),
  lastChangedAt: z.string(),
  acknowledgedAt: z.string().nullable().optional(),
})
export type Order = z.infer<typeof orderSchema>

export const chaosSchema = z.object({
  errorRate: z.number(),
  latencyMs: z.object({ min: z.number(), max: z.number() }),
  rateLimit: z.object({ capacity: z.number(), refillPerSecond: z.number() }),
  visibilityDelayMaxMs: z.number(),
  webhooks: z.object({ dropRate: z.number(), duplicateRate: z.number(), maxDelayMs: z.number() }),
  generation: z.object({ ordersPerMinute: z.number(), updatesPerMinute: z.number() }),
})

export const marketplaceSchema = z.object({
  code: z.string(),
  name: z.string(),
  supports_webhooks: z.boolean(),
  orders: z.number(),
  chaos: chaosSchema,
  api: z
    .object({ requests: z.number(), throttled: z.number(), injectedErrors: z.number() })
    .loose(),
  webhooks: z
    .object({
      emitted: z.number(),
      dropped: z.number(),
      duplicated: z.number(),
      delivered: z.number(),
    })
    .loose(),
})
export type Marketplace = z.infer<typeof marketplaceSchema>
export const marketplacesSchema = z.object({ marketplaces: z.array(marketplaceSchema) })
