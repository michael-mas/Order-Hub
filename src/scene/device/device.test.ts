import { describe, expect, it } from 'vitest'
import type { Capabilities } from './capabilities'
import { createGovernor } from './governor'
import { demote, estimateTier, renderDpr } from './tiers'

const desktop: Capabilities = {
  webgl2: true,
  maxTextureSize: 16384,
  gpuRenderer: 'NVIDIA GeForce RTX 3070',
  cores: 12,
  memoryGb: 16,
  dpr: 1,
  coarsePointer: false,
  reducedMotion: false,
  saveData: false,
  effectiveType: '4g',
}

describe('estimateTier', () => {
  it('rates a discrete-GPU desktop high', () => expect(estimateTier(desktop)).toBe('high'))
  it('treats reduced motion as off', () =>
    expect(estimateTier({ ...desktop, reducedMotion: true })).toBe('off'))
  it('treats missing WebGL2 as off', () =>
    expect(estimateTier({ ...desktop, webgl2: false })).toBe('off'))
  it('treats save-data and 2G as off', () => {
    expect(estimateTier({ ...desktop, saveData: true })).toBe('off')
    expect(estimateTier({ ...desktop, effectiveType: '2g' })).toBe('off')
  })
  it('caps touch devices at low, whatever their GPU', () =>
    expect(estimateTier({ ...desktop, coarsePointer: true })).toBe('low'))
  it('rates an integrated or masked GPU medium', () => {
    expect(estimateTier({ ...desktop, gpuRenderer: 'Intel Iris Xe' })).toBe('medium')
    expect(estimateTier({ ...desktop, gpuRenderer: null })).toBe('medium')
  })
})

describe('demote', () => {
  it('goes down one step and stops at off', () => {
    expect(demote('high')).toBe('medium')
    expect(demote('low')).toBe('off')
    expect(demote('off')).toBe('off')
  })
})

describe('renderDpr', () => {
  it('caps the device ratio per tier', () => expect(renderDpr('low', 3, 390, 844)).toBe(1.25))
  it('respects the pixel budget on huge screens', () => {
    const dpr = renderDpr('high', 2, 5120, 2880)
    expect(5120 * 2880 * dpr * dpr).toBeLessThanOrEqual(9_000_000 + 1)
  })
})

describe('createGovernor', () => {
  it('demotes when the median frame time misses the budget', () => {
    const governor = createGovernor('high', 10)
    let changed = null
    for (let i = 0; i < 10; i++) changed = governor.record(40)
    expect(changed).toBe('medium')
    expect(governor.tier).toBe('medium')
  })

  it('ignores isolated spikes', () => {
    const governor = createGovernor('high', 10)
    for (let i = 0; i < 10; i++) governor.record(i === 3 ? 200 : 10)
    expect(governor.tier).toBe('high')
  })

  it('never promotes', () => {
    const governor = createGovernor('medium', 5)
    for (let i = 0; i < 50; i++) governor.record(2)
    expect(governor.tier).toBe('medium')
  })
})
