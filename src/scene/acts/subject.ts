/**
 * Geometry budget of the scene subject. Shapes are generated inside
 * SHAPE_SCALE of the layout box, so that the burst (a radial expansion up to
 * MAX_BURST) still stays inside the sphere the layout tests check.
 * Invariant (tested): max |p| · MAX_BURST ≤ |size| / 2.
 */
export const SHAPE_SCALE = 0.72
export const MAX_BURST = 1.2
