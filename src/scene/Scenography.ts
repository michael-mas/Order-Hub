/**
 * The home-page scenography: one canvas, one context, one loop, one subject.
 * The subject blends three procedural shapes following the storyboard, spins
 * slowly and leans toward the pointer. Loaded lazily, after the text paints.
 */
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Euler,
  Group,
  Points,
  Scene,
  WebGLRenderer,
} from 'three'
import { damp } from '@/lib/motion/damp'
import { createPointsPass, setBlending } from './acts/pointsMaterial'
import { coreSphere, flowLanes, lattice, seeds, type Size3 } from './acts/shapes'
import { keyframesFromSections, stateAt, type Keyframe, type StoryState } from './acts/storyboard'
import { MAX_BURST, SHAPE_SCALE } from './acts/subject'
import { createGovernor } from './device/governor'
import { TIER_BUDGETS, renderDpr, type Tier } from './device/tiers'
import { browserPlatform, createLoop } from './engine/loop'
import { createProductionCamera } from './layout/camera'
import { HERO_LAYOUT } from './layout'
import { createRandom } from './math/random'
import { documentProgress } from './scroll/progress'

/** Core opacity when the subject sits beside the text (landscape). */
const LANDSCAPE_ALPHA = 0.85
/** Portrait screens have no free band: the subject steps back behind the text. */
const PORTRAIT_ALPHA = 0.3
const HALO_RATIO = 0.22
const RESPONSE = 3
const POINTER_RESPONSE = 4
/** Radians the subject leans toward the pointer, at most. */
const POINTER_LEAN_Y = 0.35
const POINTER_LEAN_X = 0.2
/** Idle spin, radians per second at full energy. */
const SPIN = 0.12

export interface ScenographyHandle {
  dispose(): void
}

export interface ScenographyOptions {
  /**
   * Diagnostic only (`?governor=off`): keep the initial tier whatever the frame
   * times. Used by capture scripts, whose software renderer is far slower than
   * any real GPU and would otherwise switch the scene off.
   */
  governor: boolean
}

export function startScenography(
  canvas: HTMLCanvasElement,
  initialTier: Exclude<Tier, 'off'>,
  onTierOff: () => void,
  options: ScenographyOptions = { governor: true },
): ScenographyHandle {
  let tier: Exclude<Tier, 'off'> = initialTier
  const budget = TIER_BUDGETS[tier]
  const renderer = new WebGLRenderer({ canvas, antialias: budget.antialias, alpha: true })
  renderer.setClearColor(0x000000, 0)
  const scene = new Scene()

  const entry = HERO_LAYOUT.entries.find((e) => e.name === 'subject')!
  const box = entry.size.map((v) => v * SHAPE_SCALE) as unknown as Size3
  const count = budget.particles
  const random = createRandom(20260925)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(flowLanes(count, random, box), 3))
  geometry.setAttribute('aCore', new BufferAttribute(coreSphere(count, random, box), 3))
  geometry.setAttribute('aLattice', new BufferAttribute(lattice(count, random, box), 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seeds(count, random), 1))

  const pass = createPointsPass(box[0], MAX_BURST)
  const subject = new Group()
  subject.position.set(...entry.position)
  subject.scale.setScalar(entry.scale)
  for (const material of [pass.halo, pass.core]) {
    const points = new Points(geometry, material)
    points.frustumCulled = false
    subject.add(points)
  }
  scene.add(subject)
  const base = new Euler(...entry.rotation)

  let camera = createProductionCamera(HERO_LAYOUT.camera, 1)
  let keyframes: Keyframe[] = []

  const resize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    const dpr = renderDpr(tier, window.devicePixelRatio || 1, w, h)
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    camera = createProductionCamera(HERO_LAYOUT.camera, w / h)
    for (const m of [pass.core, pass.halo]) m.uniforms.uPixelRatio!.value = dpr * (h / 800)
    const sections = [...document.querySelectorAll<HTMLElement>('[data-scene-act]')].map((el) => {
      const rect = el.getBoundingClientRect()
      return { act: el.dataset.sceneAct ?? '', top: rect.top + window.scrollY, height: rect.height }
    })
    keyframes = keyframesFromSections(sections, document.documentElement.scrollHeight, h)
  }

  const applyTheme = () => {
    const root = document.documentElement
    const accent = getComputedStyle(root).getPropertyValue('--accent').trim()
    const color = new Color(accent || '#3ddc97')
    pass.core.uniforms.uColor!.value.copy(color)
    pass.halo.uniforms.uColor!.value.copy(color)
    setBlending(pass, root.dataset.theme !== 'light')
  }

  const pointer = { x: 0, y: 0 }
  const lean = { x: 0, y: 0 }
  const finePointer = window.matchMedia('(pointer: fine)').matches
  const onPointer = (event: PointerEvent) => {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1
    pointer.y = (event.clientY / window.innerHeight) * 2 - 1
  }

  const themeObserver = new MutationObserver(applyTheme)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  })
  window.addEventListener('resize', resize)
  if (finePointer) window.addEventListener('pointermove', onPointer, { passive: true })
  applyTheme()
  resize()

  const governor = createGovernor(tier)
  let state: StoryState = stateAt(0, keyframes)
  let spin = 0

  const loop = createLoop(browserPlatform, ({ dt, frameMs, elapsed }) => {
    const p = documentProgress(
      window.scrollY,
      document.documentElement.scrollHeight,
      window.innerHeight,
    )
    const target = stateAt(p, keyframes)
    state = {
      core: damp(state.core, target.core, RESPONSE, dt),
      flow: damp(state.flow, target.flow, RESPONSE, dt),
      lattice: damp(state.lattice, target.lattice, RESPONSE, dt),
      energy: damp(state.energy, target.energy, RESPONSE, dt),
      burst: damp(state.burst, target.burst, RESPONSE, dt),
    }
    const sum = state.core + state.flow + state.lattice || 1
    const orientation = window.innerWidth >= window.innerHeight ? LANDSCAPE_ALPHA : PORTRAIT_ALPHA
    const alpha = orientation * (0.45 + 0.55 * state.energy)
    for (const m of [pass.core, pass.halo]) {
      m.uniforms.uWeights!.value.set(state.core / sum, state.flow / sum, state.lattice / sum)
      m.uniforms.uBurst!.value = state.burst
      m.uniforms.uTime!.value = elapsed
    }
    pass.core.uniforms.uAlpha!.value = alpha
    pass.halo.uniforms.uAlpha!.value = alpha * HALO_RATIO

    spin += dt * SPIN * (0.4 + 0.6 * state.energy)
    lean.x = damp(lean.x, pointer.y * POINTER_LEAN_X, POINTER_RESPONSE, dt)
    lean.y = damp(lean.y, pointer.x * POINTER_LEAN_Y, POINTER_RESPONSE, dt)
    subject.rotation.set(base.x + lean.x, base.y + spin + lean.y, base.z)

    renderer.render(scene, camera)

    const demoted = options.governor ? governor.record(frameMs) : null
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
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointer)
      geometry.dispose()
      pass.core.dispose()
      pass.halo.dispose()
      renderer.dispose()
    },
  }
}
