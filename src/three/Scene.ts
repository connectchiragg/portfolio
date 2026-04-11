/**
 * Scene.ts — Core Three.js renderer / scene / camera bootstrap for the
 * "Late Night, Bengaluru" portfolio. Owns the WebGLRenderer, the animation
 * loop (via `setAnimationLoop`), tick subscriptions, ResizeObserver wiring,
 * and full teardown of GPU resources.
 */

import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  ACESFilmicToneMapping,
  SRGBColorSpace,
  PCFShadowMap,
  Mesh,
} from 'three'
import type { Material, BufferGeometry } from 'three'
import type { SceneContext, SceneOptions } from './contracts'

type TickCallback = (dt: number, elapsed: number) => void

export function createScene(opts: SceneOptions): SceneContext {
  const { canvas, antialias = true, pixelRatio } = opts

  const renderer = new WebGLRenderer({
    canvas,
    antialias,
    powerPreference: 'high-performance',
  })
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatio ?? 2))

  const scene = new Scene()

  const camera = new PerspectiveCamera(45, 1, 0.1, 100)
  camera.position.set(0, 1.6, 4)
  camera.lookAt(0, 1.2, 0)

  const tickCallbacks = new Set<TickCallback>()

  const onTick = (cb: TickCallback): (() => void) => {
    tickCallbacks.add(cb)
    return () => {
      tickCallbacks.delete(cb)
    }
  }

  const startTime = performance.now()
  let lastTime = startTime

  renderer.setAnimationLoop(() => {
    const now = performance.now()
    const dt = (now - lastTime) / 1000
    const elapsed = (now - startTime) / 1000
    lastTime = now

    for (const cb of tickCallbacks) {
      cb(dt, elapsed)
    }

    renderer.render(scene, camera)
  })

  const resize = (): void => {
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === 0 || h === 0) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
  }

  const resizeObserver = new ResizeObserver(() => {
    resize()
  })
  resizeObserver.observe(canvas)

  const dispose = (): void => {
    renderer.setAnimationLoop(null)
    tickCallbacks.clear()
    resizeObserver.disconnect()

    scene.traverse((obj) => {
      const mesh = obj as Mesh
      const geometry = mesh.geometry as BufferGeometry | undefined
      if (geometry && typeof geometry.dispose === 'function') {
        geometry.dispose()
      }
      const material = mesh.material as Material | Material[] | undefined
      if (material) {
        if (Array.isArray(material)) {
          for (const m of material) m.dispose()
        } else {
          material.dispose()
        }
      }
    })

    renderer.dispose()
  }

  resize()

  return {
    renderer,
    scene,
    camera,
    onTick,
    resize,
    dispose,
  }
}
