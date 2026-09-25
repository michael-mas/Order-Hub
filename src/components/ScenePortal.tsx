'use client'

/**
 * The only mount point of the 3D. Renders nothing until the page has painted
 * and the browser is idle, and nothing at all at tier `off` (no WebGL2,
 * reduced motion, save-data, slow network, low memory) or with `?3d=off`.
 * The scene chunk is imported only then — never in the initial bundle.
 */
import { useEffect, useRef, useState } from 'react'
import { readCapabilities } from '@/scene/device/capabilities'
import { estimateTier, type Tier } from '@/scene/device/tiers'

export function ScenePortal() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tier, setTier] = useState<Tier>('off')

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('3d') === 'off') return
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 300))
    const cancel = window.cancelIdleCallback ?? window.clearTimeout
    const handle = idle(() => setTier(estimateTier(readCapabilities())))
    return () => cancel(handle)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (tier === 'off' || !canvas) return
    let disposed = false
    let dispose: (() => void) | undefined
    void import('@/scene/Scenography').then(({ startScenography }) => {
      if (disposed) return
      const handle = startScenography(canvas, tier, () => setTier('off'))
      dispose = handle.dispose
      document.documentElement.dataset.scene = tier
    })
    return () => {
      disposed = true
      dispose?.()
      delete document.documentElement.dataset.scene
    }
  }, [tier])

  if (tier === 'off') return null
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  )
}
