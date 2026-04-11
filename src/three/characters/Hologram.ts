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
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  Points,
  PointsMaterial,
  BufferGeometry,
  Float32BufferAttribute,
  ShaderMaterial,
  type Material,
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
  root.name = 'Hologram'

  // Base shader material — individual meshes get clones so each can have its
  // own uniform values even though they share the compiled program.
  const baseMaterial = createHologramMaterial()
  const clonedMaterials: ShaderMaterial[] = []
  const originalMaterials = new Map<Mesh, Material | Material[]>()

  avatar.root.traverse((obj) => {
    const mesh = obj as Mesh
    if ((mesh as unknown as { isMesh?: boolean }).isMesh) {
      originalMaterials.set(mesh, mesh.material)
      const cloned = baseMaterial.clone()
      clonedMaterials.push(cloned)
      mesh.material = cloned
    }
  })

  root.add(avatar.root)

  // Glowing platform pad under the figure.
  const platformGeo = new CylinderGeometry(0.6, 0.6, 0.05, 32)
  const platformMat = baseMaterial.clone()
  clonedMaterials.push(platformMat)
  const platform = new Mesh(platformGeo, platformMat)
  platform.name = 'HologramPlatform'
  platform.position.y = 0.025
  root.add(platform)

  // Dotted tron-grid floor around the platform.
  const grid = buildGridPoints()
  grid.name = 'HologramGrid'
  root.add(grid)

  // ── Audio analyser state ──────────────────────────────────────────────
  let analyser: AnalyserNode | null = null
  let audioBuffer: Uint8Array<ArrayBuffer> | null = null

  // ── Public API ────────────────────────────────────────────────────────
  const setReveal = (v: number) => {
    const clamped = Math.max(0, Math.min(1, v))
    for (const mat of clonedMaterials) {
      mat.uniforms.uReveal.value = clamped
    }
    // Fade the dotted grid alongside the shader materials.
    const gridMat = grid.material as PointsMaterial
    gridMat.opacity = 0.9 * clamped
  }

  const bindAnalyser = (node: AnalyserNode) => {
    analyser = node
    audioBuffer = new Uint8Array(new ArrayBuffer(node.frequencyBinCount))
  }

  const tick = (_dt: number, elapsed: number) => {
    // Advance time uniform on every cloned material.
    for (const mat of clonedMaterials) {
      mat.uniforms.uTime.value = elapsed
    }

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
      }
    }
  }

  const dispose = () => {
    // Restore original avatar materials.
    for (const [mesh, original] of originalMaterials) {
      mesh.material = original
    }
    originalMaterials.clear()

    // Dispose every cloned shader material (including the platform's).
    for (const mat of clonedMaterials) {
      mat.dispose()
    }
    clonedMaterials.length = 0

    // Dispose base material + program slot.
    baseMaterial.dispose()

    // Remove platform + grid from the group and release their GPU resources.
    root.remove(platform)
    platformGeo.dispose()

    root.remove(grid)
    grid.geometry.dispose()
    ;(grid.material as PointsMaterial).dispose()

    // Detach the avatar root so the owning module can still dispose it.
    root.remove(avatar.root)

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
