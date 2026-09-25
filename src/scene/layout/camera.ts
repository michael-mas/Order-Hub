import { PerspectiveCamera, Vector3 } from 'three'
import type { CameraSpec } from './schema'

/**
 * Distance at which a sphere of `radius` fits the view, using whichever of the
 * horizontal or vertical FOV is narrower (portrait screens are limited
 * horizontally — fitting on the vertical FOV alone crops them).
 */
export function fitDistance(radius: number, fovDegrees: number, aspect: number): number {
  const fovY = (fovDegrees * Math.PI) / 180
  const fovX = 2 * Math.atan(Math.tan(fovY / 2) * aspect)
  return radius / Math.sin(Math.min(fovX, fovY) / 2)
}

/** Builds the production camera for a given aspect ratio. Pure; no renderer. */
export function createProductionCamera(spec: CameraSpec, aspect: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(spec.fovDegrees, aspect, spec.near, spec.far)
  const target = new Vector3(...spec.target)
  const direction = new Vector3(...spec.direction).normalize()
  const distance = fitDistance(spec.fitRadius, spec.fovDegrees, aspect)
  camera.position.copy(target).addScaledVector(direction, distance)
  camera.lookAt(target)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  return camera
}
