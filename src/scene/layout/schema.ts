/**
 * Scene layouts are data, validated at load time. Components read
 * `LAYOUT.x.position`; no transform literal lives inline in rendering code.
 */
import { z } from 'zod'

const finite = z.number().refine(Number.isFinite, 'must be finite')
export const vec3Schema = z.tuple([finite, finite, finite])
export type Vec3 = z.infer<typeof vec3Schema>

const TWO_PI = Math.PI * 2
const radians = finite.refine((v) => Math.abs(v) <= TWO_PI, 'rotation must be radians in [-2π, 2π]')

export const entrySchema = z
  .object({
    name: z.string().regex(/^[a-z][a-zA-Z0-9]*$/, 'camelCase name'),
    /** World position of the object's local origin. */
    position: vec3Schema,
    /** Euler XYZ, radians — write them with `deg()`. */
    rotation: z.tuple([radians, radians, radians]),
    /** Uniform scale. */
    scale: finite.positive(),
    /** Local extents before scale, centred on the origin (a plane has one 0 axis). */
    size: z.tuple([finite.nonnegative(), finite.nonnegative(), finite.nonnegative()]),
    /** Accepted scale bounds — catches ×100 / ×1000 import mistakes. */
    scaleRange: z.tuple([finite.positive(), finite.positive()]),
    /** Must project entirely inside the production camera at every tested aspect. */
    mustBeInFrame: z.boolean(),
    /** Its box bottom must sit on the layout floor. */
    grounded: z.boolean(),
    /** Takes part in the pairwise non-collision check. */
    solid: z.boolean(),
  })
  .refine((e) => e.scaleRange[0] <= e.scaleRange[1], 'scaleRange min > max')

export type LayoutEntry = z.infer<typeof entrySchema>

export const cameraSchema = z.object({
  /** Direction the camera comes from, relative to the target; normalised at use. */
  direction: vec3Schema,
  target: vec3Schema,
  /** Vertical field of view, degrees (three.js convention). */
  fovDegrees: finite.min(10).max(100),
  /** Radius of the sphere, around `target`, that must stay in frame at any aspect. */
  fitRadius: finite.positive(),
  near: finite.positive(),
  far: finite.positive(),
})

export type CameraSpec = z.infer<typeof cameraSchema>

export const layoutSchema = z
  .object({
    id: z.string().min(1),
    floorY: finite,
    camera: cameraSchema,
    entries: z.array(entrySchema).min(1),
  })
  .refine(
    (l) => new Set(l.entries.map((e) => e.name)).size === l.entries.length,
    'duplicate entry name',
  )

export type SceneLayout = z.infer<typeof layoutSchema>

/**
 * Aspect ratios every in-frame assertion runs against: 360×800 portrait up to
 * 2560×1080 ultrawide.
 */
export const FRAME_ASPECTS = [
  360 / 800,
  390 / 844,
  768 / 1024,
  1440 / 900,
  1920 / 1080,
  2560 / 1080,
] as const
