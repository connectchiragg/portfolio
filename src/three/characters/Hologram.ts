/// <reference types="vite-plugin-glsl/ext" />
/**
 * Hologram.ts — W6 — About-section hologram interlude.
 *
 * Wraps an Avatar (duck-typed via the `Hologram`/`Avatar` contracts in
 * `src/three/contracts.d.ts`) by traversing its root, cloning a custom
 * `ShaderMaterial` onto every mesh, and grouping the result with a glowing
 * platform and a dotted tron-grid floor.
 *
 * The shader (see `../shaders/hologram.{vert,frag}.glsl`) provides a cyan
 * fresnel rim, vertical scan lines, an RGB split and audio-reactive
 * brightness. An optional `AnalyserNode` is polled each tick for bass bins
 * and fed into the `uAudioLevel` uniform so the figure breathes to the mix.
 *
 * The returned object satisfies the `Hologram` contract and additionally
 * exposes a `tick(dt, elapsed)` method the orchestrator can wire into the
 * main render loop. `dispose()` restores the original avatar materials and
 * releases every cloned shader material, the platform mesh and the grid.
 */

import {
  AdditiveBlending,
  CanvasTexture,
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  PointLight,
  Points,
  PointsMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
} from 'three'

import type { Avatar, Hologram } from '../contracts'
import vertexShader from '../shaders/hologram.vert.glsl'
import fragmentShader from '../shaders/hologram.frag.glsl'

/** Non-contract extension exposed by the concrete hologram implementation. */
export interface HologramTickable extends Hologram {
  /** Called once per frame by the orchestrator's main loop. */
  tick: (dt: number, elapsed: number) => void
}

function createHologramMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uAudioLevel: { value: 0 },
      uColor: { value: new Color('#4ad8ff') },
    },
  })
}

function buildGridPoints(): Points {
  // 17x17 grid of points across an 8x8 plane (matches PlaneGeometry(8,8,16,16)).
  const size = 8
  const divisions = 16
  const step = size / divisions
  const half = size / 2
  const positions: number[] = []
  for (let i = 0; i <= divisions; i++) {
    for (let j = 0; j <= divisions; j++) {
      positions.push(-half + i * step, 0, -half + j * step)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  const material = new PointsMaterial({
    color: 0x4ad8ff,
    size: 0.06,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  })
  const points = new Points(geometry, material)
  points.position.y = 0.001
  return points
}

export function createHologram(avatar: Avatar): HologramTickable {
  const root = new Group()
  root.name = 'HologramFx'

  // Phase 7C+: the body material swap is gone. The wardrobe-reveal lives
  // inside the Avatar itself (Avatar.ts injects onBeforeCompile chunks into
  // both the t-shirt and the jersey body materials). All Hologram does now
  // is forward setReveal(v) → avatar.setScanReveal(v) and animate the
  // platform + grid + counter readout in lock-step.

  const baseMaterial = createHologramMaterial()
  const clonedMaterials: ShaderMaterial[] = []

  // ── Sci-fi platform — procedural canvas texture ────────────────────
  // A flat disc with a detailed HUD-style pattern drawn via Canvas2D:
  // concentric rings, radial tick marks, hexagonal grid, crosshair
  // reticle, and circuit-trace arcs. Transparent background so the
  // tron-grid dots show through.
  const PLAT_RADIUS = 0.75
  const platformGroup = new Group()
  platformGroup.name = 'HologramPlatformRig'
  root.add(platformGroup)

  // Build the canvas texture
  const RES = 1024
  const canvas = document.createElement('canvas')
  canvas.width = RES
  canvas.height = RES
  const ctx = canvas.getContext('2d')!
  const cx = RES / 2
  const cy = RES / 2

  // Helper: stroke a circle
  const strokeCircle = (r: number, lw: number, alpha: number) => {
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.lineWidth = lw
    ctx.strokeStyle = `rgba(74, 216, 255, ${alpha})`
    ctx.stroke()
  }

  // Concentric rings — bold with heavy glow
  // Wide soft glow pass, then bright crisp pass on top
  strokeCircle(RES * 0.48, 18, 0.3)   // outer wide glow
  strokeCircle(RES * 0.48, 8, 0.6)    // outer mid glow
  strokeCircle(RES * 0.48, 3.5, 1.0)  // outer crisp
  strokeCircle(RES * 0.44, 14, 0.25)  // second wide glow
  strokeCircle(RES * 0.44, 6, 0.5)    // second mid glow
  strokeCircle(RES * 0.44, 2.5, 0.9)  // second crisp
  strokeCircle(RES * 0.38, 8, 0.2)
  strokeCircle(RES * 0.38, 2.0, 0.7)
  strokeCircle(RES * 0.30, 6, 0.15)
  strokeCircle(RES * 0.30, 2.0, 0.65)
  strokeCircle(RES * 0.20, 4, 0.12)
  strokeCircle(RES * 0.20, 1.5, 0.5)
  strokeCircle(RES * 0.10, 3, 0.1)
  strokeCircle(RES * 0.10, 1.2, 0.45)

  // Radial tick marks on the outer ring
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2
    const inner = i % 6 === 0 ? RES * 0.41 : RES * 0.43
    const outer = RES * 0.47
    const lw = i % 6 === 0 ? 4.5 : 1.2
    const alpha = i % 6 === 0 ? 1.0 : 0.4
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
    ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer)
    ctx.lineWidth = lw
    ctx.strokeStyle = `rgba(74, 216, 255, ${alpha})`
    ctx.stroke()
  }

  // Crosshair reticle — very glowy
  const reticleLen = RES * 0.14
  // Wide glow
  ctx.strokeStyle = `rgba(74, 216, 255, 0.15)`
  ctx.lineWidth = 14
  ctx.beginPath(); ctx.moveTo(cx - reticleLen, cy); ctx.lineTo(cx + reticleLen, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy - reticleLen); ctx.lineTo(cx, cy + reticleLen); ctx.stroke()
  // Mid glow
  ctx.strokeStyle = `rgba(74, 216, 255, 0.35)`
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(cx - reticleLen, cy); ctx.lineTo(cx + reticleLen, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy - reticleLen); ctx.lineTo(cx, cy + reticleLen); ctx.stroke()
  // Crisp
  ctx.strokeStyle = `rgba(74, 216, 255, 0.8)`
  ctx.lineWidth = 1.5
  ctx.beginPath(); ctx.moveTo(cx - reticleLen, cy); ctx.lineTo(cx + reticleLen, cy); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy - reticleLen); ctx.lineTo(cx, cy + reticleLen); ctx.stroke()
  // Centre dot with big glow
  ctx.beginPath()
  ctx.arc(cx, cy, 12, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(74, 216, 255, 0.1)`
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, 6, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(74, 216, 255, 0.35)`
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, 3, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(74, 216, 255, 1.0)`
  ctx.fill()

  // Hexagonal grid pattern (inside the mid ring)
  const hexR = RES * 0.035 // hex cell radius
  const hexH = hexR * Math.sqrt(3)
  ctx.strokeStyle = `rgba(74, 216, 255, 0.18)`
  ctx.lineWidth = 0.9
  const gridRadius = RES * 0.36
  for (let row = -15; row <= 15; row++) {
    for (let col = -15; col <= 15; col++) {
      const hx = cx + col * hexR * 1.5
      const hy = cy + row * hexH + (col % 2 === 0 ? 0 : hexH / 2)
      const dist = Math.sqrt((hx - cx) ** 2 + (hy - cy) ** 2)
      if (dist > gridRadius || dist < RES * 0.08) continue
      ctx.beginPath()
      for (let k = 0; k < 6; k++) {
        const a = (Math.PI / 3) * k - Math.PI / 6
        const px = hx + hexR * 0.8 * Math.cos(a)
        const py = hy + hexR * 0.8 * Math.sin(a)
        k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }
  }

  // Circuit-trace arcs (decorative partial arcs)
  const drawArc = (r: number, startDeg: number, endDeg: number, lw: number, alpha: number) => {
    ctx.beginPath()
    ctx.arc(cx, cy, r, (startDeg * Math.PI) / 180, (endDeg * Math.PI) / 180)
    ctx.lineWidth = lw
    ctx.strokeStyle = `rgba(74, 216, 255, ${alpha})`
    ctx.stroke()
  }
  drawArc(RES * 0.35, 20, 80, 4, 0.8)
  drawArc(RES * 0.35, 200, 260, 4, 0.8)
  drawArc(RES * 0.25, 100, 170, 3.5, 0.7)
  drawArc(RES * 0.25, 280, 350, 3.5, 0.7)
  drawArc(RES * 0.15, 45, 135, 3, 0.6)
  drawArc(RES * 0.15, 225, 315, 3, 0.6)

  // Small corner markers on cardinal directions (outer ring)
  const markerR = RES * 0.46
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2
    const mx = cx + Math.cos(a) * markerR
    const my = cy + Math.sin(a) * markerR
    ctx.strokeStyle = `rgba(74, 216, 255, 0.6)`
    ctx.lineWidth = 1.5
    // Small diamond
    const s = 6
    ctx.beginPath()
    ctx.moveTo(mx, my - s); ctx.lineTo(mx + s, my)
    ctx.lineTo(mx, my + s); ctx.lineTo(mx - s, my)
    ctx.closePath()
    ctx.stroke()
  }

  const platformTex = new CanvasTexture(canvas)
  const platformGeo = new CircleGeometry(PLAT_RADIUS, 64)
  const platformMat = new MeshBasicMaterial({
    map: platformTex,
    transparent: true,
    side: DoubleSide,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const platform = new Mesh(platformGeo, platformMat)
  platform.name = 'HologramPlatform'
  platform.rotation.x = -Math.PI / 2
  platform.position.y = 0.02
  platformGroup.add(platform)

  // Glow disc — a larger, soft, additive circle underneath for bloom
  const glowGeo = new CircleGeometry(PLAT_RADIUS * 1.4, 64)
  const glowMat = new MeshBasicMaterial({
    color: 0x4ad8ff,
    transparent: true,
    opacity: 0.15,
    side: DoubleSide,
    depthWrite: false,
    blending: AdditiveBlending,
  })
  const glowDisc = new Mesh(glowGeo, glowMat)
  glowDisc.rotation.x = -Math.PI / 2
  glowDisc.position.y = 0.015
  platformGroup.add(glowDisc)

  // Upward PointLight — casts cyan light onto the avatar from below
  const platLight = new PointLight(0x4ad8ff, 8, 4, 1.5)
  platLight.position.set(0, 0.3, 0)
  platformGroup.add(platLight)

  // Dotted tron-grid floor around the platform.
  const grid = buildGridPoints()
  grid.name = 'HologramGrid'
  root.add(grid)

  // ── Audio analyser state ──────────────────────────────────────────────
  let analyser: AnalyserNode | null = null
  let audioBuffer: Uint8Array<ArrayBuffer> | null = null

  // ── Public API ────────────────────────────────────────────────────────
  const avatarWithScan = avatar as Avatar & {
    setScanReveal?: (v: number) => void
  }
  const setReveal = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    // Drive the wardrobe-reveal scan inside the Avatar.
    avatarWithScan.setScanReveal?.(clamped)
    // Animate the platform glow + grid alpha alongside the body scan.
    for (const mat of clonedMaterials) {
      mat.uniforms.uReveal.value = clamped
    }
    // Drive platform + glow + light + grid with reveal
    platformMat.opacity = clamped
    glowMat.opacity = 0.15 * clamped
    platLight.intensity = 8 * clamped
    const gridMat = grid.material as PointsMaterial
    gridMat.opacity = 0.9 * clamped
  }

  const bindAnalyser = (node: AnalyserNode) => {
    analyser = node
    audioBuffer = new Uint8Array(new ArrayBuffer(node.frequencyBinCount))
  }

  const tick = (_dt: number, elapsed: number) => {
    // Advance time uniform on every cloned material (body + platform).
    for (const mat of clonedMaterials) {
      mat.uniforms.uTime.value = elapsed
    }
    // Slowly rotate the platform disc for a scanning effect
    platform.rotation.z = elapsed * 0.15

    // Poll analyser for bass amplitude if bound and producing data.
    if (analyser && audioBuffer) {
      try {
        analyser.getByteTimeDomainData(audioBuffer)
      } catch {
        return
      }
      const bins = Math.min(8, audioBuffer.length)
      if (bins > 0) {
        let sum = 0
        for (let i = 0; i < bins; i++) {
          // Centre byte-time-domain samples around 0 then take magnitude.
          sum += Math.abs(audioBuffer[i] - 128)
        }
        // Max magnitude per sample is 128; normalise to 0..1.
        const level = Math.min(1, sum / (bins * 128))
        for (const mat of clonedMaterials) {
          mat.uniforms.uAudioLevel.value = level
        }
        void level // platformMat is now a MeshBasicMaterial, no uniforms
      }
    }
  }

  const dispose = () => {
    // Phase 7C+: body materials live on the Avatar now; nothing for the
    // hologram to restore. Just dispose the platform + grid + analyser.
    platformMat.dispose()
    platformTex.dispose()
    platformGeo.dispose()
    glowGeo.dispose()
    glowMat.dispose()

    // Dispose base material + program slot.
    baseMaterial.dispose()

    root.remove(platformGroup)

    root.remove(grid)
    grid.geometry.dispose()
    ;(grid.material as PointsMaterial).dispose()

    analyser = null
    audioBuffer = null
  }

  return {
    root,
    bindAnalyser,
    setReveal,
    dispose,
    tick,
  }
}
