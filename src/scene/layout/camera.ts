import { PerspectiveCamera, Vector3 } from 'three'
import type { CameraSpec } from './schema'

export type Shift = readonly [number, number]

/**
 * Distance at which a sphere of `radius` fits the view. Uses whichever of the
 * horizontal or vertical FOV is narrower (portrait screens are limited
 * horizontally), after reserving the part of the frame lost to `shift`.
 */
export function fitDistance(
  radius: number,
  fovDegrees: number,
  aspect: number,
  shift: Shift = [0, 0],
): number {
  const halfTanY = Math.tan((fovDegrees * Math.PI) / 360)
  const halfTanX = halfTanY * aspect
  const usableX = halfTanX * (1 - 2 * Math.abs(shift[0]))
  const usableY = halfTanY * (1 - 2 * Math.abs(shift[1]))
  return radius / Math.sin(Math.atan(Math.min(usableX, usableY)))
}

/** Where the subject sits on screen for an aspect: right half in landscape, lower part in portrait. */
export function subjectShift(spec: CameraSpec, aspect: number): Shift {
  return aspect >= 1 ? spec.shiftLandscape : spec.shiftPortrait
}

/** Builds the production camera for a given aspect ratio. Pure; no renderer. */
export function createProductionCamera(spec: CameraSpec, aspect: number): PerspectiveCamera {
  const shift = subjectShift(spec, aspect)
  const camera = new PerspectiveCamera(spec.fovDegrees, aspect, spec.near, spec.far)
  const target = new Vector3(...spec.target)
  const direction = new Vector3(...spec.direction).normalize()
  camera.position
    .copy(target)
    .addScaledVector(direction, fitDistance(spec.fitRadius, spec.fovDegrees, aspect, shift))
  camera.lookAt(target)
  // Shift the image, not the camera: positive x moves the subject right, positive y moves it down.
  const w = 1000 * aspect
  const h = 1000
  camera.setViewOffset(w, h, -shift[0] * w, -shift[1] * h, w, h)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()
  return camera
}
