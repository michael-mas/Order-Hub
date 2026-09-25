import { BoxGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene } from 'three'
import { describe, expect, it } from 'vitest'
import { createPicker } from './picker'

function setup() {
  const scene = new Scene()
  const camera = new PerspectiveCamera(50, 1, 0.1, 100)
  camera.position.set(0, 0, 5)
  camera.updateMatrixWorld()
  const target = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
  target.name = 'target'
  const decor = new Mesh(new BoxGeometry(10, 10, 0.1), new MeshBasicMaterial())
  decor.name = 'decor'
  decor.position.z = 1
  scene.add(target, decor)
  scene.updateMatrixWorld()
  return { camera, target, decor }
}

describe('createPicker', () => {
  it('only hits explicit targets, even behind decor', () => {
    const { camera, target } = setup()
    const picker = createPicker([target])
    picker.setPointer(0, 0)
    expect(picker.update(camera)?.name).toBe('target')
  })

  it('casts at most once per frame, however many pointer events arrive', () => {
    const { camera, target } = setup()
    const picker = createPicker([target])
    for (let i = 0; i < 50; i++) picker.setPointer(i / 1000, 0)
    picker.update(camera)
    picker.update(camera)
    expect(picker.casts).toBe(1)
  })

  it('reports a miss and logs it', () => {
    const { camera, target } = setup()
    const seen: Array<string | null> = []
    const picker = createPicker([target], (hit) => seen.push(hit?.name ?? null))
    picker.setPointer(0.95, 0.95)
    expect(picker.update(camera)).toBeNull()
    expect(seen).toEqual([null])
  })
})
