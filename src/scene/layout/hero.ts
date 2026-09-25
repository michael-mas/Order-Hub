/**
 * Layout of the home-page scenography: one subject that changes shape with the
 * scroll (core → flow → structure), a floor and a backdrop. Geometry is
 * procedural; this file only places volumes.
 */
import { deg } from '../math/angles'
import { layoutSchema } from './schema'

export const HERO_LAYOUT = layoutSchema.parse({
  id: 'hero',
  floorY: -2.6,
  camera: {
    direction: [0, 0.18, 1],
    target: [0, 0, 0],
    fovDegrees: 40,
    fitRadius: 2.4,
    near: 0.1,
    far: 60,
    shiftLandscape: [0.24, 0],
    shiftPortrait: [0, 0.32],
    textBandNdcX: -0.1,
  },
  entries: [
    {
      name: 'subject',
      position: [0, 0, 0],
      rotation: [deg(-10), deg(24), 0],
      scale: 1,
      size: [2.6, 2.6, 2.6],
      scaleRange: [0.5, 2],
      mustBeInFrame: true,
      grounded: false,
      solid: true,
      rotates: true,
    },
    {
      name: 'floor',
      position: [0, -2.6, 0],
      rotation: [0, 0, 0],
      scale: 1,
      size: [14, 0, 8],
      scaleRange: [1, 1],
      mustBeInFrame: false,
      grounded: true,
      solid: true,
      rotates: false,
    },
    {
      name: 'backdrop',
      position: [0, 1.2, -6],
      rotation: [0, 0, 0],
      scale: 1,
      size: [18, 10, 0],
      scaleRange: [1, 1],
      mustBeInFrame: false,
      grounded: false,
      solid: false,
      rotates: false,
    },
  ],
})
