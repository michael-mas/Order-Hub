/**
 * Layout of the home-page scenography: an ordered flow on the left, a computed
 * structure on the right, a floor and a backdrop. Geometry is procedural; this
 * file only places volumes.
 */
import { deg } from '../math/angles'
import { layoutSchema } from './schema'

export const HERO_LAYOUT = layoutSchema.parse({
  id: 'hero',
  floorY: -1.8,
  camera: {
    direction: [0, 0.18, 1],
    target: [0, 0, 0],
    fovDegrees: 40,
    fitRadius: 3.2,
    near: 0.1,
    far: 60,
    shiftLandscape: [0.24, 0],
    shiftPortrait: [0, 0.32],
    textBandNdcX: -0.1,
  },
  entries: [
    {
      name: 'flow',
      position: [-1.45, 0, 0],
      rotation: [0, deg(-12), 0],
      scale: 1,
      size: [2, 2.2, 1.6],
      scaleRange: [0.5, 2],
      mustBeInFrame: true,
      grounded: false,
      solid: true,
    },
    {
      name: 'structure',
      position: [1.45, 0, 0],
      rotation: [deg(8), deg(24), 0],
      scale: 1,
      size: [1.6, 1.6, 1.6],
      scaleRange: [0.5, 2],
      mustBeInFrame: true,
      grounded: false,
      solid: true,
    },
    {
      name: 'floor',
      position: [0, -1.8, 0],
      rotation: [0, 0, 0],
      scale: 1,
      size: [14, 0, 8],
      scaleRange: [1, 1],
      mustBeInFrame: false,
      grounded: true,
      solid: true,
    },
    {
      name: 'backdrop',
      position: [0, 1.2, -5],
      rotation: [0, 0, 0],
      scale: 1,
      size: [18, 10, 0],
      scaleRange: [1, 1],
      mustBeInFrame: false,
      grounded: false,
      solid: false,
    },
  ],
})
