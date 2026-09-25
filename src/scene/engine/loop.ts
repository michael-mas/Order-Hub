/**
 * The single render loop of the page. One requestAnimationFrame, a clamped
 * delta, an optional frame-rate cap, and three pause conditions: tab hidden,
 * canvas off screen, or an explicit stop. Platform hooks are injected so the
 * loop is tested without a browser.
 */
import { clampDt } from '@/lib/motion/damp'

export interface LoopPlatform {
  requestFrame(callback: (nowMs: number) => void): number
  cancelFrame(handle: number): void
  isDocumentHidden(): boolean
}

export interface FrameInfo {
  /** Seconds since the previous rendered frame, clamped to MAX_DT. */
  dt: number
  /** Raw milliseconds since the previous rendered frame, for the governor. */
  frameMs: number
  elapsed: number
}

export interface Loop {
  start(): void
  stop(): void
  /** False while the canvas is outside the viewport. */
  setOnScreen(onScreen: boolean): void
  setFpsCap(fps: number | null): void
  readonly running: boolean
}

export function createLoop(platform: LoopPlatform, onFrame: (frame: FrameInfo) => void): Loop {
  let handle: number | null = null
  let onScreen = true
  let minFrameMs = 0
  let last: number | null = null
  let elapsed = 0

  const shouldRender = () => onScreen && !platform.isDocumentHidden()

  const tick = (now: number) => {
    handle = platform.requestFrame(tick)
    if (!shouldRender()) {
      // Resume without a jump: the next rendered frame starts a fresh delta.
      last = null
      return
    }
    if (last === null) {
      last = now
      return
    }
    const frameMs = now - last
    if (frameMs < minFrameMs - 0.5) return
    last = now
    const dt = clampDt(frameMs / 1000)
    elapsed += dt
    onFrame({ dt, frameMs, elapsed })
  }

  return {
    start() {
      if (handle === null) handle = platform.requestFrame(tick)
    },
    stop() {
      if (handle !== null) platform.cancelFrame(handle)
      handle = null
      last = null
    },
    setOnScreen(value) {
      onScreen = value
    },
    setFpsCap(fps) {
      minFrameMs = fps ? 1000 / fps : 0
    },
    get running() {
      return handle !== null
    },
  }
}

/** Browser platform. */
export const browserPlatform: LoopPlatform = {
  requestFrame: (cb) => requestAnimationFrame(cb),
  cancelFrame: (h) => cancelAnimationFrame(h),
  isDocumentHidden: () => document.hidden,
}
