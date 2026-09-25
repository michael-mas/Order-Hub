'use client'

/**
 * Development-only renderer for scene layouts. Renders one fixed view with
 * the inspection overlay: outlines, local and world axes, a graduated grid,
 * a label per object (name, position, rotation in degrees) and render stats.
 * `D` toggles the overlay. Sets `data-scene-ready` once the frame is drawn so
 * capture scripts know when to shoot.
 */
import { useEffect, useRef, useState } from 'react'
import { Vector3, WebGLRenderer } from 'three'
import { LAYOUTS } from '../layout'
import { toDeg } from '../math/angles'
import { buildDebugScene } from './debugScene'
import { createDebugCamera, type DebugView } from './views'

interface Label {
  name: string
  color: string
  x: number
  y: number
  text: string
}

interface Stats {
  calls: number
  triangles: number
  lines: number
}

const fmt = (values: readonly number[]) => values.map((v) => v.toFixed(2)).join(', ')

const LABEL_GAP = 16

/** Pushes labels down so none overlaps the previous one in screen space. */
function spreadLabels(labels: Label[]): Label[] {
  const sorted = [...labels].sort((a, b) => a.y - b.y)
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1]!
    const current = sorted[i]!
    if (current.y - previous.y < LABEL_GAP) current.y = previous.y + LABEL_GAP
  }
  return sorted
}

export function SceneInspector({ layoutId, view }: { layoutId: string; view: DebugView }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [labels, setLabels] = useState<Label[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [overlay, setOverlay] = useState(true)
  const layout = LAYOUTS.find((l) => l.id === layoutId)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'd' || event.key === 'D') setOverlay((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !layout) return

    const width = canvas.clientWidth
    const height = canvas.clientHeight
    const renderer = new WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
    renderer.setPixelRatio(1)
    renderer.setSize(width, height, false)

    const debug = buildDebugScene(layout)
    const camera = createDebugCamera(view, layout, width / height)
    renderer.render(debug.scene, camera)

    const projected = debug.entries.map(({ name, entry, color }): Label => {
      const p = new Vector3(...entry.position).project(camera)
      return {
        name,
        color,
        x: ((p.x + 1) / 2) * width,
        y: ((1 - p.y) / 2) * height,
        text: `pos [${fmt(entry.position)}] rot° [${fmt(entry.rotation.map(toDeg))}] ×${entry.scale}`,
      }
    })
    const { calls, triangles, lines } = renderer.info.render
    setLabels(spreadLabels(projected))
    setStats({ calls, triangles, lines })
    document.body.dataset.sceneReady = '1'

    return () => {
      delete document.body.dataset.sceneReady
      debug.dispose()
      renderer.dispose()
    }
  }, [layout, view])

  if (!layout) return <p>Unknown layout: {layoutId}</p>

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0e14',
        fontFamily: 'ui-monospace, monospace',
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {overlay && (
        <>
          {labels.map((label) => (
            <div
              key={label.name}
              style={{
                position: 'absolute',
                left: label.x,
                top: label.y,
                transform: 'translate(8px, -50%)',
                color: label.color,
                fontSize: 11,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              <strong>{label.name}</strong> {label.text}
            </div>
          ))}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              color: '#e8edf2',
              fontSize: 12,
              lineHeight: 1.5,
            }}
          >
            <div>
              layout <strong>{layout.id}</strong> · view <strong>{view}</strong> · grid 1 unit · X
              red Y green Z blue
            </div>
            {stats && (
              <div>
                draw calls {stats.calls} · triangles {stats.triangles} · lines {stats.lines}
              </div>
            )}
            <div style={{ opacity: 0.6 }}>D: toggle overlay</div>
          </div>
        </>
      )}
    </div>
  )
}
