/**
 * sakuraField.ts — A small drifting field of sakura petals rendered as a
 * Three.js `Points` object. Used both in the hero (outside the window)
 * and at the contact section (bottom-of-page "burst").
 *
 * Each petal falls slowly and sways sideways with a per-petal sine
 * offset. When a petal drops below y = -1 it resets to y = 4 for a loop.
 */

import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Points,
  PointsMaterial,
} from 'three'
import type { Object3D } from 'three'

interface SakuraHandle {
  object: Object3D
  tick: (dt: number) => void
  dispose: () => void
}

const PETAL_COUNT = 150
const RESET_Y = 4
const FLOOR_Y = -1
const FALL_SPEED = 0.4

/**
 * Build a small pink petal CanvasTexture in memory.
 */
function createPetalTexture(): CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.clearRect(0, 0, size, size)
    // Radial pink blush so the ellipse has soft edges.
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      2,
      size / 2,
      size / 2,
      size / 2,
    )
    grad.addColorStop(0, 'rgba(255, 200, 215, 1)')
    grad.addColorStop(0.6, 'rgba(255, 183, 197, 0.85)')
    grad.addColorStop(1, 'rgba(255, 183, 197, 0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.ellipse(size / 2, size / 2, size * 0.32, size * 0.22, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  const tex = new CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

/**
 * Create a drifting sakura-petal `Points` object.
 */
export function createSakuraField(): SakuraHandle {
  const geometry = new BufferGeometry()
  const positions = new Float32Array(PETAL_COUNT * 3)
  // Per-petal sway phases, kept separate from the buffer attribute.
  const swayPhase = new Float32Array(PETAL_COUNT)
  const swayFreq = new Float32Array(PETAL_COUNT)
  const swayAmp = new Float32Array(PETAL_COUNT)

  for (let i = 0; i < PETAL_COUNT; i++) {
    positions[i * 3 + 0] = (Math.random() - 0.5) * 6
    positions[i * 3 + 1] = Math.random() * (RESET_Y - FLOOR_Y) + FLOOR_Y
    positions[i * 3 + 2] = (Math.random() - 0.5) * 4
    swayPhase[i] = Math.random() * Math.PI * 2
    swayFreq[i] = 0.8 + Math.random() * 1.2
    swayAmp[i] = 0.12 + Math.random() * 0.18
  }

  geometry.setAttribute('position', new BufferAttribute(positions, 3))

  const petalTexture = createPetalTexture()
  const material = new PointsMaterial({
    size: 0.08,
    sizeAttenuation: true,
    transparent: true,
    alphaTest: 0.05,
    color: '#ffb7c5',
    map: petalTexture,
    depthWrite: false,
    blending: AdditiveBlending,
  })

  const points = new Points(geometry, material)
  points.name = 'SakuraField'

  let elapsed = 0

  const tick = (dt: number): void => {
    elapsed += dt
    const attr = geometry.getAttribute('position') as BufferAttribute
    const arr = attr.array as Float32Array
    for (let i = 0; i < PETAL_COUNT; i++) {
      const idx = i * 3
      // Fall
      arr[idx + 1] -= FALL_SPEED * dt
      // Sway
      arr[idx + 0] +=
        Math.sin(elapsed * swayFreq[i] + swayPhase[i]) * swayAmp[i] * dt
      if (arr[idx + 1] < FLOOR_Y) {
        arr[idx + 1] = RESET_Y
        arr[idx + 0] = (Math.random() - 0.5) * 6
      }
    }
    attr.needsUpdate = true
  }

  const dispose = (): void => {
    geometry.dispose()
    material.dispose()
    petalTexture.dispose()
  }

  return {
    object: points,
    tick,
    dispose,
  }
}
