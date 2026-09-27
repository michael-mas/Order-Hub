import { applyPatch, type Chaos, type ChaosPatch } from './chaos.ts'
import { OrderStore } from './orders.ts'
import type { Random } from './random.ts'
import { TokenBucket } from './tokenBucket.ts'
import { WebhookEmitter, type Deliver, type Schedule } from './webhooks.ts'

export interface MarketplaceDefinition {
  code: string
  name: string
  /** Order id prefix, e.g. NOVA-000042. */
  prefix: string
  apiKey: string
  webhookSecret: string
  /** Where change notifications go; null for a channel that only offers polling. */
  webhookTarget: string | null
  /** Beyond it, no new order is created (updates go on): memory stays bounded. */
  maxOrders: number
  chaos: Chaos
}

export interface ApiStats {
  requests: number
  served: number
  throttled: number
  injectedErrors: number
  unauthorized: number
  acknowledgements: number
}

export interface Runtime {
  /** Drives what the orders contain. */
  random: Random
  /** Drives faults (drops, duplicates, delays), so tuning them never changes the orders. */
  faults: Random
  now: () => number
  deliver: Deliver
  schedule: Schedule
}

/** One simulated marketplace: its catalogue of orders, its quota, its moods. */
export class Marketplace {
  readonly store: OrderStore
  readonly webhooks: WebhookEmitter
  readonly api: ApiStats = {
    requests: 0,
    served: 0,
    throttled: 0,
    injectedErrors: 0,
    unauthorized: 0,
    acknowledgements: 0,
  }
  private chaosConfig: Chaos
  private readonly bucket: TokenBucket
  private pendingOrders = 0
  private pendingUpdates = 0

  constructor(
    readonly definition: MarketplaceDefinition,
    private readonly runtime: Runtime,
  ) {
    this.chaosConfig = definition.chaos
    this.store = new OrderStore(definition.prefix, runtime.random)
    this.bucket = new TokenBucket(definition.chaos.rateLimit, runtime.now())
    this.webhooks = new WebhookEmitter(
      definition.code,
      definition.webhookSecret,
      runtime.faults,
      runtime.deliver,
      runtime.schedule,
      runtime.now,
    )
  }

  get chaos(): Chaos {
    return this.chaosConfig
  }

  get supportsWebhooks(): boolean {
    return this.definition.webhookTarget !== null
  }

  configure(patch: ChaosPatch): Chaos {
    this.chaosConfig = applyPatch(this.chaosConfig, patch)
    this.bucket.reconfigure(this.chaosConfig.rateLimit, this.runtime.now())
    return this.chaosConfig
  }

  replaceChaos(chaos: Chaos): Chaos {
    this.chaosConfig = chaos
    this.bucket.reconfigure(chaos.rateLimit, this.runtime.now())
    return chaos
  }

  takeToken(): ReturnType<TokenBucket['take']> {
    return this.bucket.take(this.runtime.now())
  }

  get capacityReached(): boolean {
    return this.store.size >= this.definition.maxOrders
  }

  /**
   * Creates and advances orders now, notifying the hub for each change. New
   * orders stop at the cap; returns what was actually done.
   */
  generate(orders: number, updates: number): { created: number; updated: number } {
    const delay = (): number => this.runtime.faults.int(0, this.chaosConfig.visibilityDelayMaxMs)
    const created = Math.max(0, Math.min(orders, this.definition.maxOrders - this.store.size))
    let updated = 0
    for (let i = 0; i < created; i += 1) {
      const change = this.store.create(this.runtime.now(), delay())
      this.webhooks.emit(
        this.definition.webhookTarget,
        change.kind,
        change.order,
        this.chaosConfig.webhooks,
      )
    }
    for (let i = 0; i < updates; i += 1) {
      const change = this.store.advanceRandom(this.runtime.now(), delay())
      if (!change) break
      updated += 1
      this.webhooks.emit(
        this.definition.webhookTarget,
        change.kind,
        change.order,
        this.chaosConfig.webhooks,
      )
    }
    return { created, updated }
  }

  /**
   * Background activity. Rates accumulate as fractions so the long-run
   * throughput is exact whatever the tick length.
   */
  tick(elapsedMs: number): void {
    const minutes = elapsedMs / 60_000
    this.pendingOrders += this.chaosConfig.generation.ordersPerMinute * minutes
    this.pendingUpdates += this.chaosConfig.generation.updatesPerMinute * minutes
    const orders = Math.floor(this.pendingOrders)
    const updates = Math.floor(this.pendingUpdates)
    this.pendingOrders -= orders
    this.pendingUpdates -= updates
    if (orders > 0 || updates > 0) this.generate(orders, updates)
  }

  status(): object {
    return {
      code: this.definition.code,
      name: this.definition.name,
      supports_webhooks: this.supportsWebhooks,
      orders: this.store.size,
      capacity: { max_orders: this.definition.maxOrders, reached: this.capacityReached },
      chaos: this.chaosConfig,
      api: this.api,
      webhooks: this.webhooks.stats,
    }
  }
}
