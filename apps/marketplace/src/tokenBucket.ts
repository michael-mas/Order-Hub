/**
 * The quota a real marketplace applies to a merchant's plan: `capacity`
 * requests in a burst, refilled continuously at `refillPerSecond`.
 */
export interface BucketPolicy {
  capacity: number
  refillPerSecond: number
}

export type TakeResult =
  { allowed: true; remaining: number } | { allowed: false; retryAfterMs: number }

export class TokenBucket {
  private tokens: number
  private updatedAt: number

  constructor(
    private policy: BucketPolicy,
    now: number,
  ) {
    this.tokens = policy.capacity
    this.updatedAt = now
  }

  /** Changing the plan keeps the tokens already earned, within the new capacity. */
  reconfigure(policy: BucketPolicy, now: number): void {
    this.refill(now)
    this.policy = policy
    this.tokens = Math.min(this.tokens, policy.capacity)
  }

  take(now: number): TakeResult {
    this.refill(now)
    if (this.tokens >= 1) {
      this.tokens -= 1
      return { allowed: true, remaining: Math.floor(this.tokens) }
    }
    if (this.policy.refillPerSecond <= 0) {
      return { allowed: false, retryAfterMs: Number.POSITIVE_INFINITY }
    }
    const missing = 1 - this.tokens
    return {
      allowed: false,
      retryAfterMs: Math.ceil((missing / this.policy.refillPerSecond) * 1000),
    }
  }

  private refill(now: number): void {
    // A clock that goes backwards must never mint tokens.
    const elapsed = Math.max(0, now - this.updatedAt)
    this.tokens = Math.min(
      this.policy.capacity,
      this.tokens + (elapsed / 1000) * this.policy.refillPerSecond,
    )
    this.updatedAt = Math.max(this.updatedAt, now)
  }
}
