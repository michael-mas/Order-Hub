/**
 * Builds an inspection scene from a layout: one outlined box per entry with
 * its local axes, world axes, and a grid graduated in scene units at floor
 * level. No renderer here — this runs (and is tested) in Node.
 */
import {
  AxesHelper,
  BoxGeometry,
  Color,
  EdgesGeometry,
  GridHelper,
  Group,
  LineBasicMaterial,
  LineSegments,
  Scene,
} from 'three'
import { worldMatrix } from '../layout/assert'
import type { LayoutEntry, SceneLayout } from '../layout/schema'

const PALETTE = ['#3ddc97', '#5ab0ff', '#ffb454', '#ff6b9d', '#b18cff', '#9aa7b4']
const PLANE_EPSILON = 0.002

export interface DebugEntryInfo {
  name: string
  entry: LayoutEntry
  color: string
}

export interface DebugScene {
  scene: Scene
  entries: DebugEntryInfo[]
  dispose(): void
}

export function buildDebugScene(layout: SceneLayout): DebugScene {
  const scene = new Scene()
  scene.background = new Color('#0a0e14')
  const disposables: Array<{ dispose(): void }> = []

  const gridSize = 20
  const grid = new GridHelper(gridSize, gridSize, '#3a4654', '#1e2630')
  grid.position.y = layout.floorY
  scene.add(grid)
  disposables.push(grid)

  const worldAxes = new AxesHelper(2)
  scene.add(worldAxes)
  disposables.push(worldAxes)

  const entries = layout.entries.map((entry, index): DebugEntryInfo => {
    const color = PALETTE[index % PALETTE.length]!
    const [w, h, d] = entry.size.map((v) => Math.max(v, PLANE_EPSILON)) as [number, number, number]
    const box = new BoxGeometry(w, h, d)
    const edges = new EdgesGeometry(box)
    box.dispose()
    const material = new LineBasicMaterial({ color })
    const outline = new LineSegments(edges, material)
    disposables.push(edges, material)

    const group = new Group()
    group.name = entry.name
    group.matrixAutoUpdate = false
    group.matrix.copy(worldMatrix(entry))
    group.add(outline)

    const localAxes = new AxesHelper(Math.min(0.6, Math.max(w, h, d) / 2))
    group.add(localAxes)
    disposables.push(localAxes)

    scene.add(group)
    return { name: entry.name, entry, color }
  })

  scene.updateMatrixWorld(true)

  return {
    scene,
    entries,
    dispose() {
      for (const d of disposables) d.dispose()
    },
  }
}
