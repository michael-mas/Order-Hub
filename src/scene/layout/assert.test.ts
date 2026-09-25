import { describe, expect, it } from 'vitest'
import { deg } from '../math/angles'
import {
  findCollisions,
  findGroundErrors,
  findOutOfFrame,
  findScaleErrors,
  worldBox,
} from './assert'
import { fitDistance } from './camera'
import type { LayoutEntry, SceneLayout } from './schema'

function entry(overrides: Partial<LayoutEntry> & Pick<LayoutEntry, 'name'>): LayoutEntry {
  return {
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: 1,
    size: [1, 1, 1],
    scaleRange: [0.5, 2],
    mustBeInFrame: true,
    grounded: false,
    solid: true,
    ...overrides,
  }
}

function layout(entries: LayoutEntry[]): SceneLayout {
  return {
    id: 'fixture',
    floorY: 0,
    camera: {
      direction: [0, 0, 1],
      target: [0, 0, 0],
      fovDegrees: 40,
      fitRadius: 2,
      near: 0.1,
      far: 100,
    },
    entries,
  }
}

describe('worldBox', () => {
  it('accounts for rotation', () => {
    const box = worldBox(entry({ name: 'bar', size: [2, 0.2, 0.2], rotation: [0, 0, deg(90)] }))
    expect(box.max.y - box.min.y).toBeCloseTo(2, 6)
    expect(box.max.x - box.min.x).toBeCloseTo(0.2, 6)
  })

  it('accounts for scale', () => {
    const box = worldBox(entry({ name: 'cube', scale: 3 }))
    expect(box.max.x).toBeCloseTo(1.5, 6)
  })
})

describe('findCollisions', () => {
  it('names the colliding pair', () => {
    const problems = findCollisions(
      layout([
        entry({ name: 'left', position: [0, 0, 0] }),
        entry({ name: 'right', position: [0.5, 0, 0] }),
      ]),
    )
    expect(problems).toEqual(['collision: "left" intersects "right"'])
  })

  it('ignores non-solid objects', () => {
    const problems = findCollisions(
      layout([entry({ name: 'left' }), entry({ name: 'ghost', solid: false })]),
    )
    expect(problems).toEqual([])
  })
})

describe('findOutOfFrame', () => {
  it('flags an object behind the camera frame', () => {
    const problems = findOutOfFrame(layout([entry({ name: 'lost', position: [40, 0, 0] })]), [1])
    expect(problems[0]).toContain('"lost"')
  })

  it('flags an object that only leaves the frame in portrait', () => {
    const wide = entry({ name: 'wide', size: [3.8, 0.2, 0.2] })
    const l = { ...layout([wide]), camera: { ...layout([]).camera, fitRadius: 1 } }
    expect(findOutOfFrame(l, [2])).toEqual([])
    expect(findOutOfFrame(l, [0.45]).length).toBe(1)
  })
})

describe('findGroundErrors', () => {
  it('flags a floating grounded object', () => {
    const problems = findGroundErrors(
      layout([entry({ name: 'crate', grounded: true, position: [0, 1, 0] })]),
    )
    expect(problems[0]).toContain('"crate"')
  })

  it('accepts an object resting on the floor', () => {
    expect(
      findGroundErrors(layout([entry({ name: 'crate', grounded: true, position: [0, 0.5, 0] })])),
    ).toEqual([])
  })
})

describe('findScaleErrors', () => {
  it('catches a ×100 import mistake', () => {
    expect(findScaleErrors(layout([entry({ name: 'cat', scale: 100 })]))[0]).toContain('"cat"')
  })
})

describe('fitDistance', () => {
  it('backs off further in portrait than in landscape', () => {
    expect(fitDistance(2, 40, 0.45)).toBeGreaterThan(fitDistance(2, 40, 1.8))
  })
})
