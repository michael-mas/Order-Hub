import { describe, expect, it, vi } from 'vitest'
import { activeSection, createScrollStore, documentProgress, sectionProgress } from './progress'

describe('sectionProgress', () => {
  it('is 0 before the section enters and 1 after it leaves', () => {
    expect(sectionProgress(900, 500, 800)).toBe(0)
    expect(sectionProgress(-600, 500, 800)).toBe(1)
  })
  it('is 0.5 when the section is centred', () => {
    expect(sectionProgress(150, 500, 800)).toBeCloseTo(0.5, 6)
  })
})

describe('documentProgress', () => {
  it('stays in [0, 1], even on overscroll and short pages', () => {
    expect(documentProgress(-40, 3000, 800)).toBe(0)
    expect(documentProgress(5000, 3000, 800)).toBe(1)
    expect(documentProgress(0, 500, 800)).toBe(0)
  })
})

describe('activeSection', () => {
  it('picks the section crossing the viewport centre', () => {
    const sections = [
      { id: 'hero', top: -700, height: 800 },
      { id: 'cases', top: 100, height: 1200 },
    ]
    expect(activeSection(sections, 800)).toBe('cases')
  })
})

describe('createScrollStore', () => {
  it('notifies listeners only when the active section changes', () => {
    const store = createScrollStore()
    const listener = vi.fn()
    store.onSectionChange(listener)
    const at = (top: number) => [{ id: 'hero', top, height: 800 }]
    store.update(at(0), 0, 2000, 800)
    store.update(at(-10), 10, 2000, 800)
    store.update(at(-20), 20, 2000, 800)
    expect(listener).toHaveBeenCalledTimes(1)
    store.update(at(-900), 900, 2000, 800)
    expect(listener).toHaveBeenCalledTimes(2)
    expect(store.snapshot().active).toBeNull()
  })
})
