/**
 * DeskMonitor.ts — Procedural "fake code editor" CanvasTexture for the
 * laptop screen in the Hero room. Paints coloured syntax-highlight rectangles
 * on a 512×320 canvas and scrolls them upward every frame. No real text is
 * rendered — the effect reads as "late-night coding glow" from camera distance.
 *
 * Owned by W5. Consumed by Room.ts (attaches `texture` to the laptop screen
 * mesh material and calls `update(dt)` from the scene tick loop).
 */

import { CanvasTexture, SRGBColorSpace, LinearFilter } from 'three'

interface CodeLine {
  y: number
  width: number
  indent: number
  color: string
  height: number
}

export interface DeskMonitor {
  texture: CanvasTexture
  update: (dt: number) => void
  dispose: () => void
}

const WIDTH = 512
const HEIGHT = 320
const LINE_HEIGHT = 14
const SCROLL_SPEED = 18 // pixels per second

// Palette — matches the global.css accent tokens.
const BG = '#0d1240'
const GUTTER = '#1a1f55'
const LINE_COLORS = [
  '#4ad8ff', // cyan
  '#ff5ecb', // magenta
  '#fff27a', // lemon
  '#7affb8', // mint
  '#ffa35e', // tangerine
  '#fff5e9', // cream (plain text)
]

function randomLine(y: number): CodeLine {
  const indent = Math.floor(Math.random() * 4) * 16
  const width = 60 + Math.random() * (WIDTH - indent - 90)
  const color = LINE_COLORS[Math.floor(Math.random() * LINE_COLORS.length)]
  return {
    y,
    width,
    indent,
    color,
    height: 6 + Math.random() * 2,
  }
}

export function createDeskMonitorTexture(): DeskMonitor {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('DeskMonitor: unable to acquire 2D canvas context')
  }

  // Build an initial stack of lines filling the canvas + a buffer above.
  const lines: CodeLine[] = []
  for (let y = -LINE_HEIGHT; y < HEIGHT + LINE_HEIGHT * 4; y += LINE_HEIGHT) {
    lines.push(randomLine(y))
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.magFilter = LinearFilter
  texture.minFilter = LinearFilter
  texture.generateMipmaps = false

  const draw = (): void => {
    // Background
    ctx.fillStyle = BG
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    // Gutter (fake line-number column)
    ctx.fillStyle = GUTTER
    ctx.fillRect(0, 0, 36, HEIGHT)

    // Code lines
    for (const line of lines) {
      if (line.y < -LINE_HEIGHT || line.y > HEIGHT) continue
      ctx.fillStyle = line.color
      ctx.fillRect(44 + line.indent, line.y, line.width, line.height)
    }

    // Scanline sheen
    ctx.fillStyle = 'rgba(255,255,255,0.03)'
    for (let y = 0; y < HEIGHT; y += 4) {
      ctx.fillRect(0, y, WIDTH, 1)
    }

    texture.needsUpdate = true
  }

  draw()

  const update = (dt: number): void => {
    const delta = SCROLL_SPEED * dt
    for (const line of lines) {
      line.y -= delta
    }
    // Recycle lines that have drifted off the top.
    for (const line of lines) {
      if (line.y + line.height < -LINE_HEIGHT) {
        // Find the bottom-most line to append after it.
        let maxY = -Infinity
        for (const l of lines) {
          if (l.y > maxY) maxY = l.y
        }
        const fresh = randomLine(maxY + LINE_HEIGHT)
        line.y = fresh.y
        line.width = fresh.width
        line.indent = fresh.indent
        line.color = fresh.color
        line.height = fresh.height
      }
    }
    draw()
  }

  const dispose = (): void => {
    texture.dispose()
  }

  return { texture, update, dispose }
}
