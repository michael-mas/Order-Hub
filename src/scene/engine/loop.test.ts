import { describe, expect, it } from 'vitest'
import { MAX_DT } from '@/lib/motion/damp'
import { createLoop, type FrameInfo, type LoopPlatform } from './loop'

function fakePlatform() {
  let queued: ((now: number) => void) | null = null
  let hidden = false
  const platform: LoopPlatform = {
    requestFrame: (cb) => {
      queued = cb
      return 1
    },
    cancelFrame: () => {
      queued = null
    },
    isDocumentHidden: () => hidden,
  }
  return {
    platform,
    frame(now: number) {
      const cb = queued
      queued = null
      cb?.(now)
    },
    setHidden(value: boolean) {
      hidden = value
    },
  }
}

function run(frames: number[], configure?: (fake: ReturnType<typeof fakePlatform>) => void) {
  const fake = fakePlatform()
  const seen: FrameInfo[] = []
  const loop = createLoop(fake.platform, (f) => seen.push(f))
  configure?.(fake)
  loop.start()
  for (const t of frames) fake.frame(t)
  return { seen, loop, fake }
}

describe('createLoop', () => {
  it('renders each frame with its delta', () => {
    const { seen } = run([0, 16, 32, 48])
    expect(seen).toHaveLength(3)
    expect(seen[0]!.dt).toBeCloseTo(0.016, 6)
  })

  it('clamps a long gap (returning tab) to MAX_DT', () => {
    const { seen } = run([0, 5000])
    expect(seen[0]!.dt).toBe(MAX_DT)
  })

  it('does not render while the document is hidden, and resumes without a jump', () => {
    const fake = fakePlatform()
    const seen: FrameInfo[] = []
    const loop = createLoop(fake.platform, (f) => seen.push(f))
    loop.start()
    fake.frame(0)
    fake.frame(16)
    fake.setHidden(true)
    fake.frame(32)
    fake.frame(3000)
    fake.setHidden(false)
    fake.frame(3016)
    fake.frame(3032)
    expect(seen).toHaveLength(2)
    expect(seen[1]!.frameMs).toBe(16)
  })

  it('does not render while off screen', () => {
    const fake = fakePlatform()
    const seen: FrameInfo[] = []
    const loop = createLoop(fake.platform, (f) => seen.push(f))
    loop.setOnScreen(false)
    loop.start()
    for (const t of [0, 16, 32]) fake.frame(t)
    expect(seen).toHaveLength(0)
  })

  it('honours a frame-rate cap', () => {
    const fake = fakePlatform()
    const seen: FrameInfo[] = []
    const loop = createLoop(fake.platform, (f) => seen.push(f))
    loop.setFpsCap(30)
    loop.start()
    for (let t = 0; t <= 1000; t += 1000 / 60) fake.frame(t)
    expect(seen.length).toBeGreaterThanOrEqual(28)
    expect(seen.length).toBeLessThanOrEqual(31)
  })

  it('stops cleanly', () => {
    const { loop } = run([0, 16])
    loop.stop()
    expect(loop.running).toBe(false)
  })
})
