import { describe, expect, it } from 'vitest'
import { LAYOUTS } from './index'
import {
  findCollisions,
  findGroundErrors,
  findOutOfFrame,
  findScaleErrors,
  findTextBandIntrusions,
  validateLayout,
} from './assert'

describe.each(LAYOUTS.map((l) => [l.id, l] as const))('layout "%s"', (_id, layout) => {
  it('has no scale outside its bounds', () => expect(findScaleErrors(layout)).toEqual([]))
  it('grounds every grounded object on the floor', () =>
    expect(findGroundErrors(layout)).toEqual([]))
  it('has no colliding solid objects', () => expect(findCollisions(layout)).toEqual([]))
  it('keeps every framed object inside the camera at all aspects', () =>
    expect(findOutOfFrame(layout)).toEqual([]))
  it('keeps framed objects out of the text band on landscape screens', () =>
    expect(findTextBandIntrusions(layout)).toEqual([]))
  it('is sound overall', () => expect(validateLayout(layout)).toEqual([]))
})
