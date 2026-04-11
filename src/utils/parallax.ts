/**
 * parallax.ts — Subtle mouse-follow camera parallax.
 *
 * Adds a small additive rotation (max ±3°) to the camera based on the
 * mouse's normalised device coordinates. The orchestrator wires this
 * AFTER the GSAP master timeline's `lookAt` callback each frame so the
 * parallax rides on top of the scroll-driven camera move instead of
 * fighting it.
 *
 * Uses frame-rate independent exponential smoothing:
 *     k = 1 - exp(-dt * 6)
 */

import type { PerspectiveCamera } from 'three'
import { MathUtils } from 'three'

const MAX_ANGLE_DEG = 3
const MAX_ANGLE_RAD = (MAX_ANGLE_DEG * Math.PI) / 180
const SMOOTH_RATE = 6

export interface ParallaxHandle {
  tick: (dt: number) => void
  dispose: () => void
}

/**
 * Mounts a `mousemove` listener and returns a `tick(dt)` function the
 * orchestrator should call every frame *after* any timeline-driven
 * camera `lookAt` has been applied.
 */
export function mountMouseParallax(camera: PerspectiveCamera): ParallaxHandle {
  // Target normalised device coords — (-1..1, -1..1). Centred at rest.
  let targetX = 0
  let targetY = 0

  // Current smoothed offsets in radians.
  let currentX = 0
  let currentY = 0

  const onMouseMove = (ev: MouseEvent): void => {
    const w = window.innerWidth || 1
    const h = window.innerHeight || 1
    targetX = (ev.clientX / w) * 2 - 1
    targetY = (ev.clientY / h) * 2 - 1
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })

  const tick = (dt: number): void => {
    const k = 1 - Math.exp(-dt * SMOOTH_RATE)

    const desiredYaw = -targetX * MAX_ANGLE_RAD
    const desiredPitch = -targetY * MAX_ANGLE_RAD

    currentX = MathUtils.lerp(currentX, desiredYaw, k)
    currentY = MathUtils.lerp(currentY, desiredPitch, k)

    // Additive: timeline has already set rotation this frame via lookAt.
    camera.rotation.y += currentX
    camera.rotation.x += currentY
  }

  const dispose = (): void => {
    window.removeEventListener('mousemove', onMouseMove)
  }

  return { tick, dispose }
}
