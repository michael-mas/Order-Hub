import { describe, expect, it } from 'vitest'
import { ACT_STATES, keyframesFromSections, stateAt, type SectionBox } from './storyboard'

const VH = 800
const sections: SectionBox[] = [
  { act: 'hero', top: 0, height: 800 },
  { act: 'halves', top: 800, height: 700 },
  { act: 'flow', top: 1500, height: 1400 },
  { act: 'flow', top: 2900, height: 1400 },
  { act: 'structure', top: 4300, height: 1600 },
  { act: 'threshold', top: 5900, height: 700 },
  { act: 'skills', top: 6600, height: 1200 },
  { act: 'path', top: 7800, height: 900 },
  { act: 'contact', top: 8700, height: 900 },
  { act: 'unknown', top: 9600, height: 100 },
]
const DOC = 9700
const keyframes = keyframesFromSections(sections, DOC, VH)

describe('keyframesFromSections', () => {
  it('ignores unknown acts and sorts by position', () => {
    expect(keyframes).toHaveLength(9)
    const ats = keyframes.map((k) => k.at)
    expect([...ats].sort((a, b) => a - b)).toEqual(ats)
  })
})

describe('stateAt', () => {
  const at = (p: number) => stateAt(p, keyframes)

  it('starts at rest and ends calm', () => {
    expect(at(0)).toEqual(ACT_STATES.hero)
    expect(at(1)).toEqual(ACT_STATES.contact)
  })

  it('lets the flow dominate the e-commerce cases and the structure dominate System://Alive', () => {
    const flowCase = at(keyframes.find((k) => k.state === ACT_STATES.flow)!.at)
    const structureCase = at(keyframes.find((k) => k.state === ACT_STATES.structure)!.at)
    expect(flowCase.flow).toBeGreaterThan(flowCase.structure)
    expect(structureCase.structure).toBeGreaterThan(structureCase.flow)
  })

  it('peaks at the experience threshold', () => {
    const peak = keyframes.find((k) => k.state === ACT_STATES.threshold)!.at
    const samples = [...Array.from({ length: 201 }, (_, i) => i / 200), peak]
    const energies = samples.map((p) => at(p).energy)
    expect(Math.max(...energies)).toBe(at(peak).energy)
    expect(at(peak).energy).toBe(1)
  })

  it('is continuous: a small scroll never makes the scene jump', () => {
    for (let i = 0; i < 1000; i++) {
      const a = at(i / 1000)
      const b = at((i + 1) / 1000)
      expect(Math.abs(a.energy - b.energy)).toBeLessThan(0.05)
      expect(Math.abs(a.flow - b.flow)).toBeLessThan(0.05)
    }
  })

  it('keeps every value in [0, 1]', () => {
    for (let i = 0; i <= 100; i++) {
      for (const v of Object.values(at(i / 100))) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('falls back to rest with no sections', () => {
    expect(stateAt(0.5, [])).toEqual(ACT_STATES.hero)
  })
})
