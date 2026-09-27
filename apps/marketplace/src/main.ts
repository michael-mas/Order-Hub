import { serve } from '@hono/node-server'
import { createWorld } from './world.ts'

const env = (name: string, fallback: string): string => process.env[name] ?? fallback

const world = createWorld({
  seed: Number(env('SIMULATOR_SEED', '20260926')),
  hubUrl: env('HUB_URL', 'http://localhost:8000'),
  controlToken: process.env.CONTROL_TOKEN ?? null,
  maxOrders: Number(env('MAX_ORDERS_PER_MARKETPLACE', '2000')),
  secrets: {
    novaApiKey: env('NOVA_API_KEY', 'nova-demo-key'),
    novaWebhookSecret: env('NOVA_WEBHOOK_SECRET', 'nova-demo-webhook-secret'),
    atlasApiKey: env('ATLAS_API_KEY', 'atlas-demo-key'),
  },
})

const TICK_MS = 1_000
let last = Date.now()
setInterval(() => {
  const now = Date.now()
  world.tick(now - last)
  last = now
}, TICK_MS)

const port = Number(env('PORT', '8100'))
serve({ fetch: world.app.fetch, port }, () => {
  console.log(`marketplace simulator listening on :${port}`)
})
