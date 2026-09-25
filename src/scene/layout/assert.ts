/**
 * Spatial assertions over a scene layout. Pure three.js math — runs in Node,
 * no GPU. Each check returns human-readable problems naming the culprit.
 */
import { Box3, Euler, Frustum, Matrix4, Quaternion, Vector3 } from 'three'
import { createProductionCamera } from './camera'
import { FRAME_ASPECTS, type LayoutEntry, type SceneLayout } from './schema'

const GROUND_TOLERANCE = 1e-3

export function worldMatrix(entry: LayoutEntry): Matrix4 {
  const quaternion = new Quaternion().setFromEuler(new Euler(...entry.rotation))
  return new Matrix4().compose(
    new Vector3(...entry.position),
    quaternion,
    new Vector3(entry.scale, entry.scale, entry.scale),
  )
}

/** Axis-aligned world box of an entry, after rotation and scale. */
export function worldBox(entry: LayoutEntry): Box3 {
  const half = new Vector3(...entry.size).multiplyScalar(0.5)
  return new Box3(half.clone().negate(), half).applyMatrix4(worldMatrix(entry))
}

function corners(box: Box3): Vector3[] {
  const { min, max } = box
  const out: Vector3[] = []
  for (const x of [min.x, max.x])
    for (const y of [min.y, max.y]) for (const z of [min.z, max.z]) out.push(new Vector3(x, y, z))
  return out
}

export function findCollisions(layout: SceneLayout): string[] {
  const solids = layout.entries.filter((e) => e.solid)
  const problems: string[] = []
  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      const a = solids[i]!
      const b = solids[j]!
      if (worldBox(a).intersectsBox(worldBox(b))) {
        problems.push(`collision: "${a.name}" intersects "${b.name}"`)
      }
    }
  }
  return problems
}

export function findOutOfFrame(
  layout: SceneLayout,
  aspects: readonly number[] = FRAME_ASPECTS,
): string[] {
  const problems: string[] = []
  for (const aspect of aspects) {
    const camera = createProductionCamera(layout.camera, aspect)
    const frustum = new Frustum().setFromProjectionMatrix(
      new Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse),
    )
    for (const entry of layout.entries.filter((e) => e.mustBeInFrame)) {
      const outside = corners(worldBox(entry)).filter((c) => !frustum.containsPoint(c))
      if (outside.length > 0) {
        problems.push(
          `out of frame: "${entry.name}" at aspect ${aspect.toFixed(2)} (${outside.length}/8 corners outside)`,
        )
      }
    }
  }
  return problems
}

export function findGroundErrors(layout: SceneLayout): string[] {
  return layout.entries
    .filter((e) => e.grounded)
    .flatMap((e) => {
      const minY = worldBox(e).min.y
      return Math.abs(minY - layout.floorY) > GROUND_TOLERANCE
        ? [`not grounded: "${e.name}" bottom at y=${minY.toFixed(3)}, floor at y=${layout.floorY}`]
        : []
    })
}

export function findScaleErrors(layout: SceneLayout): string[] {
  return layout.entries.flatMap((e) => {
    const [min, max] = e.scaleRange
    return e.scale < min || e.scale > max
      ? [`scale out of range: "${e.name}" is ${e.scale}, allowed [${min}, ${max}]`]
      : []
  })
}

/** Every spatial problem of a layout; an empty array means the layout is sound. */
export function validateLayout(layout: SceneLayout): string[] {
  return [
    ...findScaleErrors(layout),
    ...findGroundErrors(layout),
    ...findCollisions(layout),
    ...findOutOfFrame(layout),
  ]
}
