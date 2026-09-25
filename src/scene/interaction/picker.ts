/**
 * Pointer picking against an explicit list of targets — never the whole scene
 * graph, most of which (particles, backdrops) is not meant to be hit. The
 * pointer is recorded on every event but the ray is cast at most once per
 * frame, and only when the pointer moved.
 */
import { Raycaster, Vector2, type Camera, type Intersection, type Object3D } from 'three'

export interface Pick {
  name: string
  distance: number
  object: Object3D
}

export interface Picker {
  /** Normalised device coordinates, [-1, 1]. Cheap: stores the value only. */
  setPointer(ndcX: number, ndcY: number): void
  clearPointer(): void
  /** Call once per frame. Returns the current hit, recomputed only if needed. */
  update(camera: Camera): Pick | null
  /** Number of rays actually cast — exposed for tests and the debug overlay. */
  readonly casts: number
}

export function createPicker(
  targets: readonly Object3D[],
  log?: (hit: Pick | null) => void,
): Picker {
  const raycaster = new Raycaster()
  const pointer = new Vector2()
  let hasPointer = false
  let dirty = false
  let current: Pick | null = null
  let casts = 0

  const toPick = (hit: Intersection | undefined): Pick | null =>
    hit ? { name: hit.object.name, distance: hit.distance, object: hit.object } : null

  return {
    setPointer(x, y) {
      pointer.set(x, y)
      hasPointer = true
      dirty = true
    },
    clearPointer() {
      hasPointer = false
      dirty = false
      current = null
    },
    update(camera) {
      if (!hasPointer || !dirty) return current
      dirty = false
      raycaster.setFromCamera(pointer, camera)
      casts += 1
      current = toPick(raycaster.intersectObjects(targets as Object3D[], false)[0])
      log?.(current)
      return current
    },
    get casts() {
      return casts
    },
  }
}
