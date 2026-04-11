/**
 * localClock.ts — Tiny canvas-backed digital clock texture.
 *
 * Produces a 256×64 `CanvasTexture` displaying the visitor's current
 * local time as HH:MM in monospace white-on-deep-blue. Intended to be
 * mounted as the emissive face of a small desk-clock prop next to the
 * laptop in the hero room.
 *
 * The orchestrator is responsible for driving `update()` — either from
 * the main `sceneCtx.onTick` loop (cheap, runs every frame) or from a
 * 1-second `setInterval`. This module does NOT start any timers itself
 * so it remains trivially disposable.
 */

import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'

const WIDTH = 256
const HEIGHT = 64
const BG_COLOR = '#0d1240'
const FG_COLOR = '#ffffff'
const FONT = "36px 'JetBrains Mono', monospace"

export interface ClockTextureHandle {
  texture: CanvasTexture
  update: () => void
  dispose: () => void
}

/** Creates a reusable canvas-backed digital clock texture. */
export function createClockTexture(): ClockTextureHandle {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT

  const ctx = canvas.getContext('2d')
  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = false

  const update = (): void => {
    if (!ctx) return

    const now = new Date()
    const hh = String(now.getHours()).padStart(2, '0')
    const mm = String(now.getMinutes()).padStart(2, '0')
    const time = `${hh}:${mm}`

    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    ctx.fillStyle = FG_COLOR
    ctx.font = FONT
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(time, WIDTH / 2, HEIGHT / 2)

    texture.needsUpdate = true
  }

  // Paint once so the texture is never blank on first render.
  update()

  const dispose = (): void => {
    texture.dispose()
  }

  return { texture, update, dispose }
}
