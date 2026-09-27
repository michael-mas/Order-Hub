/**
 * A per-process cooldown. The public demo must not let anyone turn the
 * analyse button into a way to spend model tokens in a loop.
 */
export function createCooldown(intervalMs: number, now: () => number = Date.now) {
  let last = Number.NEGATIVE_INFINITY
  return {
    /** Returns 0 when allowed (and starts the cooldown), else the ms to wait. */
    take(): number {
      const elapsed = now() - last
      if (elapsed < intervalMs) return intervalMs - elapsed
      last = now()
      return 0
    },
  }
}
