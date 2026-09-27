import { z } from 'zod'
import {
  analysisSchema,
  channelSchema,
  failedMessagesSchema,
  journalPageSchema,
  marketplacesSchema,
  orderSchema,
  overviewSchema,
  type Action,
} from './hub'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function call<T>(url: string, schema: z.ZodType<T>, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Request failed (${response.status})`
    throw new ApiError(message, response.status)
  }
  return schema.parse(body)
}

const post = (body?: unknown): RequestInit => ({
  method: 'POST',
  ...(body === undefined
    ? {}
    : { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
})

const done = z.object({}).loose()

export const api = {
  journal: (after: string | null) =>
    call(`/api/hub/api/journal?limit=200${after ? `&after=${after}` : ''}`, journalPageSchema),
  channels: () => call('/api/hub/api/channels', z.object({ channels: z.array(channelSchema) })),
  overview: () => call('/api/hub/api/overview', overviewSchema),
  failedMessages: () => call('/api/hub/api/failed-messages', failedMessagesSchema),
  orders: () => call('/api/hub/api/orders?itemsPerPage=12', z.array(orderSchema)),
  marketplaces: () => call('/api/simulator/control/marketplaces', marketplacesSchema),
  consistency: () => call('/api/consistency', z.unknown()),

  channelAction: (code: string, action: 'pause' | 'resume' | 'reconcile') =>
    call(`/api/hub/api/channels/${code}/${action}`, done, post()),
  replay: (id: string) => call(`/api/hub/api/failed-messages/${id}/replay`, done, post()),
  replayAll: () => call('/api/hub/api/failed-messages/replay', done, post()),
  analyse: () => call('/api/hub/api/incident-analyses', analysisSchema, post()),
  runAction: (action: Action, channel: string | null) =>
    call('/api/hub/api/incident-analyses/actions', done, post({ action, channel })),
  preset: (code: string, preset: 'calm' | 'busy' | 'storm') =>
    call(`/api/simulator/control/marketplaces/${code}/preset/${preset}`, done, { method: 'PUT' }),
  burst: (code: string) =>
    call(
      `/api/simulator/control/marketplaces/${code}/generate`,
      done,
      post({ orders: 20, updates: 20 }),
    ),
}
