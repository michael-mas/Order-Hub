import { describe, expect, it } from 'vitest'
import { HERO_LAYOUT } from '../layout'
import { buildDebugScene } from './debugScene'
import { DEBUG_VIEWS, createDebugCamera, isDebugView } from './views'

describe('buildDebugScene', () => {
  it('creates one named group per layout entry', () => {
    const debug = buildDebugScene(HERO_LAYOUT)
    for (const entry of HERO_LAYOUT.entries) {
      expect(debug.scene.getObjectByName(entry.name)).toBeDefined()
    }
    expect(debug.entries).toHaveLength(HERO_LAYOUT.entries.length)
    debug.dispose()
  })
})

describe('debug views', () => {
  it('builds every view without NaN in the camera', () => {
    for (const view of DEBUG_VIEWS) {
      for (const aspect of [0.45, 1, 2.37]) {
        const camera = createDebugCamera(view, HERO_LAYOUT, aspect)
        expect(camera.position.toArray().every(Number.isFinite)).toBe(true)
      }
    }
  })

  it('validates view names', () => {
    expect(isDebugView('front')).toBe(true)
    expect(isDebugView('behind')).toBe(false)
  })
})
