/**
 * Frame-rate independent exponential smoothing.
 *
 * Hand-written lerps such as `lerp(a, b, dt * 5.5)` are banned in this
 * repository: once `dt` exceeds 1 / 5.5 s the factor passes 1 and the
 * interpolation overshoots its target. `dampFactor` stays in [0, 1) by
 * construction and gives the same response at 30 and 60 fps.
 */

/** Largest frame delta, in seconds, that any smoothing will consume. */
export const MAX_DT = 1 / 20

/** Clamps a frame delta to [0, MAX_DT]. Non-finite or negative input yields 0. */
export function clampDt(dt: number): number {
  if (!Number.isFinite(dt) || dt <= 0) return 0
  return Math.min(dt, MAX_DT)
}

/** Interpolation factor for a decay rate `lambda` (1/s) over `dt` seconds. Always in [0, 1). */
export function dampFactor(dt: number, lambda: number): number {
  if (!Number.isFinite(lambda) || lambda <= 0) return 0
  return 1 - Math.exp(-clampDt(dt) * lambda)
}

/** Moves `current` toward `target`; never overshoots. */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * dampFactor(dt, lambda)
}
