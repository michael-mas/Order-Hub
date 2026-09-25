/**
 * Fixed, deterministic inspection cameras. Front, top and side are
 * orthographic so distances can be read off the graduated grid.
 */
import { Box3, Camera, OrthographicCamera, PerspectiveCamera, Vector3 } from 'three'
import { worldBox } from '../layout/assert'
import { createProductionCamera } from '../layout/camera'
import type { SceneLayout } from '../layout/schema'

export const DEBUG_VIEWS = ['front', 'top', 'side', 'iso', 'production'] as const
export type DebugView = (typeof DEBUG_VIEWS)[number]

export function isDebugView(value: string): value is DebugView {
  return (DEBUG_VIEWS as readonly string[]).includes(value)
}

/** Bounds of every framed entry, so debug views ignore huge floors and backdrops. */
export function framedBounds(layout: SceneLayout): Box3 {
  const box = new Box3()
  const framed = layout.entries.filter((e) => e.mustBeInFrame)
  for (const entry of framed.length > 0 ? framed : layout.entries) box.union(worldBox(entry))
  return box
}

export function createDebugCamera(view: DebugView, layout: SceneLayout, aspect: number): Camera {
  if (view === 'production') return createProductionCamera(layout.camera, aspect)

  const bounds = framedBounds(layout)
  const center = bounds.getCenter(new Vector3())
  const radius = Math.max(bounds.getSize(new Vector3()).length() / 2, 1) * 1.35
  const distance = radius * 4

  if (view === 'iso') {
    const camera = new PerspectiveCamera(35, aspect, 0.1, distance * 4)
    camera.position.copy(center).add(new Vector3(1, 0.8, 1).normalize().multiplyScalar(distance))
    camera.lookAt(center)
    camera.updateProjectionMatrix()
    return camera
  }

  const halfH = aspect >= 1 ? radius : radius / aspect
  const halfW = halfH * aspect
  const camera = new OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, distance * 4)
  const offset: Record<'front' | 'top' | 'side', Vector3> = {
    front: new Vector3(0, 0, distance),
    top: new Vector3(0, distance, 0),
    side: new Vector3(distance, 0, 0),
  }
  camera.position.copy(center).add(offset[view])
  if (view === 'top') camera.up.set(0, 0, -1)
  camera.lookAt(center)
  camera.updateProjectionMatrix()
  return camera
}
