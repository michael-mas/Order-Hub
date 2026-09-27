import { createApp } from './app.ts'
import { PRESETS } from './chaos.ts'
import { Marketplace, type MarketplaceDefinition } from './marketplace.ts'
import { createRandom } from './random.ts'
import { fetchDeliver, type Deliver, type Schedule } from './webhooks.ts'

export interface WorldConfig {
  seed: number
  /** Hub base URL; webhooks go to `<hubUrl>/webhooks/<code>`. */
  hubUrl: string
  controlToken: string | null
  /** Orders each marketplace keeps at most: bounds memory and listing cost. */
  maxOrders: number
  secrets: { novaApiKey: string; novaWebhookSecret: string; atlasApiKey: string }
}

export interface WorldDeps {
  now: () => number
  sleep: (ms: number) => Promise<void>
  deliver: Deliver
  schedule: Schedule
}

export const defaultDeps: WorldDeps = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  deliver: fetchDeliver,
  schedule: (task, delayMs) => {
    setTimeout(task, delayMs)
  },
}

/**
 * Two channels with opposite integration styles: `nova` pushes signed
 * webhooks, `atlas` only offers polling. Together they cover both strategies
 * the hub has to master.
 */
function definitions(config: WorldConfig): MarketplaceDefinition[] {
  return [
    {
      code: 'nova',
      name: 'Nova Market',
      prefix: 'NOVA',
      apiKey: config.secrets.novaApiKey,
      webhookSecret: config.secrets.novaWebhookSecret,
      webhookTarget: `${config.hubUrl.replace(/\/$/, '')}/webhooks/nova`,
      maxOrders: config.maxOrders,
      chaos: structuredClone(PRESETS.calm),
    },
    {
      code: 'atlas',
      name: 'Atlas Marketplace',
      prefix: 'ATLS',
      apiKey: config.secrets.atlasApiKey,
      webhookSecret: '',
      webhookTarget: null,
      maxOrders: config.maxOrders,
      chaos: structuredClone(PRESETS.calm),
    },
  ]
}

export function createWorld(config: WorldConfig, deps: WorldDeps = defaultDeps) {
  const marketplaces = new Map<string, Marketplace>()
  // Latency and error draws use their own stream so they never shift the
  // order generator: the same seed yields the same orders whatever the faults.
  let faults = createRandom(config.seed ^ 0x5eed)

  const build = (): void => {
    marketplaces.clear()
    faults = createRandom(config.seed ^ 0x5eed)
    definitions(config).forEach((definition, index) => {
      marketplaces.set(
        definition.code,
        new Marketplace(definition, {
          random: createRandom(config.seed + index * 7919),
          faults: createRandom((config.seed + index * 7919) ^ 0xfa17),
          now: deps.now,
          deliver: deps.deliver,
          schedule: deps.schedule,
        }),
      )
    })
  }
  build()

  const app = createApp({
    marketplaces,
    sleep: deps.sleep,
    randomInt: (min, max) => faults.int(min, max),
    now: deps.now,
    controlToken: config.controlToken,
    reset: build,
  })

  return {
    app,
    marketplaces,
    tick(elapsedMs: number): void {
      for (const marketplace of marketplaces.values()) marketplace.tick(elapsedMs)
    },
  }
}
