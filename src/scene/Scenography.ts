/**
 * The home-page scenography: one canvas, one context, one loop. Two procedural
 * point sets placed by HERO_LAYOUT, whose presence follows the storyboard as
 * the page scrolls. Loaded lazily, after the text has painted.
 */
import { BufferAttribute, BufferGeometry, Color, Points, Scene, WebGLRenderer } from 'three'
import { damp } from '@/lib/motion/damp'
import { createPointsPass, type PointsKind, type PointsPass } from './acts/pointsMaterial'
import { flowLanes, lattice, seeds } from './acts/shapes'
import { keyframesFromSections, stateAt, type Keyframe, type StoryState } from './acts/storyboard'
import { createGovernor } from './device/governor'
import { TIER_BUDGETS, renderDpr, type Tier } from './device/tiers'
import { browserPlatform, createLoop } from './engine/loop'
import { worldMatrix } from './layout/assert'
import { createProductionCamera } from './layout/camera'
import { HERO_LAYOUT } from './layout'
import { createRandom } from './math/random'
import { documentProgress } from './scroll/progress'

/** Keeps body text readable over the scene: points never exceed this opacity. */
const MAX_CORE_ALPHA = 0.55
const HALO_RATIO = 0.18
const RESPONSE = 3.5
/** Portrait screens have no free band beside the text: the scene steps back. */
const PORTRAIT_ALPHA = 0.55

interface Layer {
  kind: PointsKind
  pass: PointsPass
  geometry: BufferGeometry
}

export interface ScenographyHandle {
  dispose(): void
}

export function startScenography(
  canvas: HTMLCanvasElement,
  initialTier: Exclude<Tier, 'off'>,
  onTierOff: () => void,
): ScenographyHandle {
  let tier: Exclude<Tier, 'off'> = initialTier
  const budget = TIER_BUDGETS[tier]
  const renderer = new WebGLRenderer({ canvas, antialias: budget.antialias, alpha: true })
  renderer.setClearColor(0x000000, 0)
  const scene = new Scene()
  const random = createRandom(20260925)

  const layers: Layer[] = (['flow', 'structure'] as const).map((kind) => {
    const entry = HERO_LAYOUT.entries.find((e) => e.name === kind)!
    const count = Math.round(budget.particles * (kind === 'flow' ? 0.6 : 0.4))
    const positions =
      kind === 'flow' ? flowLanes(count, random, entry.size) : lattice(count, random, entry.size)
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(positions, 3))
    geometry.setAttribute('aSeed', new BufferAttribute(seeds(count, random), 1))
    const pass = createPointsPass(kind, entry.size[0], 1)
    for (const material of [pass.halo, pass.core]) {
      const points = new Points(geometry, material)
      points.matrixAutoUpdate = false
      points.matrix.copy(worldMatrix(entry))
      points.frustumCulled = false
      scene.add(points)
    }
    return { kind, pass, geometry }
  })

  let camera = createProductionCamera(HERO_LAYOUT.camera, 1)
  let keyframes: Keyframe[] = []

  const resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    const dpr = renderDpr(tier, window.devicePixelRatio || 1, w, h)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    camera = createProductionCamera(HERO_LAYOUT.camera, w / h)
    for (const layer of layers) {
      for (const m of [layer.pass.core, layer.pass.halo])
        m.uniforms.uPixelRatio!.value = dpr * (h / 800)
    }
    const sections = [...document.querySelectorAll<HTMLElement>('[data-scene-act]')].map((el) => {
      const rect = el.getBoundingClientRect()
      return { act: el.dataset.sceneAct ?? '', top: rect.top + window.scrollY, height: rect.height }
    })
    keyframes = keyframesFromSections(sections, document.documentElement.scrollHeight, h)
  }

  const applyColor = () => {
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
    const color = new Color(accent || '#3ddc97')
    for (const layer of layers) {
      layer.pass.core.uniforms.uColor!.value.copy(color)
      layer.pass.halo.uniforms.uColor!.value.copy(color)
    }
  }

  const themeObserver = new MutationObserver(applyColor)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  const scheme = window.matchMedia('(prefers-color-scheme: dark)')
  scheme.addEventListener('change', applyColor)
  window.addEventListener('resize', resize)
  applyColor()
  resize()

  const governor = createGovernor(tier)
  let state: StoryState = stateAt(0, keyframes)

  const loop = createLoop(browserPlatform, ({ dt, frameMs, elapsed }) => {
    const p = documentProgress(
      window.scrollY,
      document.documentElement.scrollHeight,
      window.innerHeight,
    )
    const target = stateAt(p, keyframes)
    state = {
      flow: damp(state.flow, target.flow, RESPONSE, dt),
      structure: damp(state.structure, target.structure, RESPONSE, dt),
      energy: damp(state.energy, target.energy, RESPONSE, dt),
    }
    for (const layer of layers) {
      const presence = layer.kind === 'flow' ? state.flow : state.structure
      const orientation = window.innerWidth >= window.innerHeight ? 1 : PORTRAIT_ALPHA
      const alpha = MAX_CORE_ALPHA * orientation * presence * (0.35 + 0.65 * state.energy)
      layer.pass.core.uniforms.uAlpha!.value = alpha
      layer.pass.halo.uniforms.uAlpha!.value = alpha * HALO_RATIO
      layer.pass.core.uniforms.uTime!.value = elapsed
      layer.pass.halo.uniforms.uTime!.value = elapsed
    }
    renderer.render(scene, camera)

    const demoted = governor.record(frameMs)
    if (demoted === 'off') onTierOff()
    else if (demoted) {
      tier = demoted
      loop.setFpsCap(TIER_BUDGETS[tier].fpsCap)
      resize()
    }
  })
  loop.setFpsCap(budget.fpsCap)
  loop.start()

  return {
    dispose() {
      loop.stop()
      themeObserver.disconnect()
      scheme.removeEventListener('change', applyColor)
      window.removeEventListener('resize', resize)
      for (const layer of layers) {
        layer.geometry.dispose()
        layer.pass.core.dispose()
        layer.pass.halo.dispose()
      }
      renderer.dispose()
    },
  }
}
