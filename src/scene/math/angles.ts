/**
 * The only sanctioned way to write an angle in scene code.
 * Rotations are stored in radians; `deg(90)` makes the unit explicit at the
 * call site. A lint rule rejects raw numeric rotation literals.
 */
export function deg(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/** Radians back to degrees, for debug display only. */
export function toDeg(radians: number): number {
  return (radians * 180) / Math.PI
}
