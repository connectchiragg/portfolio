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
  CircleGeometry,
  Color,
  DoubleSide,
  Group,
  Mesh,
  PointLight,
  TorusGeometry,
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

function buildTronGrid(): { mesh: Mesh; material: ShaderMaterial } {
  // GLSL shader-based grid — pixel-perfect sharp lines with smooth
  // analytic glow at any zoom level. No texture resolution limit.
  const size = 8
  const geo = new CircleGeometry(size / 2, 64)

  const gridVert = `
    varying vec2 vUv;
    varying vec3 vWorldPos;
    void main() {
      vUv = uv;
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `

  const gridFrag = `
    uniform float uOpacity;
    uniform float uTime;
    uniform vec3 uColor;
    uniform float uRadius;
    varying vec2 vUv;
    varying vec3 vWorldPos;

    void main() {
      // Grid in world XZ space
      float gridScale = 0.5; // cell size in world units
      vec2 coord = vWorldPos.xz / gridScale;
      vec2 grid = abs(fract(coord - 0.5) - 0.5);

      // Distance to nearest grid line (in grid-cell units)
      float lineX = grid.x;
      float lineZ = grid.y;
      float lineDist = min(lineX, lineZ);

      // Sharp core (thin bright line)
      float coreWidth = 0.02;
      float core = 1.0 - smoothstep(0.0, coreWidth, lineDist);

      // Glow (wider, softer falloff)
      float glowWidth = 0.08;
      float glow = exp(-lineDist * lineDist / (glowWidth * glowWidth));

      // Combine: white-hot core + colored glow
      vec3 coreColor = vec3(0.85, 0.97, 1.0); // near-white
      vec3 glowColor = uColor;
      vec3 col = core * coreColor + glow * glowColor * 0.6;

      // Circular boundary — fade at edge
      float dist = length(vUv - 0.5) * 2.0;
      float edge = 1.0 - smoothstep(0.92, 1.0, dist);

      // Bright ring at boundary
      float ringDist = abs(dist - 0.96);
      float ring = exp(-ringDist * ringDist / 0.0008) * 0.8;
      col += uColor * ring;

      float alpha = (core * 0.9 + glow * 0.5 + ring) * edge * uOpacity;

      // Subtle pulse
      alpha *= 0.9 + 0.1 * sin(uTime * 1.5);

      gl_FragColor = vec4(col, alpha);
    }
  `

  const mat = new ShaderMaterial({
    vertexShader: gridVert,
    fragmentShader: gridFrag,
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    uniforms: {
      uOpacity: { value: 0.9 },
      uTime: { value: 0 },
      uColor: { value: new Color(0x4ad8ff) },
      uRadius: { value: size / 2 },
    },
  })

  const mesh = new Mesh(geo, mat)
  mesh.rotation.x = -Math.PI / 2
  mesh.position.y = 0.001
  return { mesh, material: mat }
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

  // ── Sci-fi platform — GLSL shader ──────────────────────────────────
  const PLAT_RADIUS = 0.75
  const platformGroup = new Group()
  platformGroup.name = 'HologramPlatformRig'
  platformGroup.position.y = 0.15
  root.add(platformGroup)

  const platVert = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const platFrag = `
    #define PI 3.14159265
    uniform float uTime;
    uniform float uReveal;
    uniform vec3 uColor;
    varying vec2 vUv;

    // Smooth line helper — distance-based with glow
    float line(float d, float width, float glowWidth) {
      float core = 1.0 - smoothstep(0.0, width, abs(d));
      float glow = exp(-d * d / (glowWidth * glowWidth));
      return core + glow * 0.5;
    }

    // Ring helper
    float ring(float dist, float r, float width, float glowW) {
      return line(dist - r, width, glowW);
    }

    void main() {
      vec2 p = (vUv - 0.5) * 2.0; // -1..1
      float dist = length(p);
      float angle = atan(p.y, p.x);

      // Clip to circle
      if (dist > 1.0) discard;

      // Dark opaque background
      vec3 bg = vec3(0.02, 0.04, 0.08);
      vec3 col = bg;
      float alpha = 1.0;

      vec3 coreCol = vec3(0.7, 0.96, 1.0);

      // ── Concentric rings ──
      float r1 = ring(dist, 0.96, 0.004, 0.015);
      float r2 = ring(dist, 0.88, 0.003, 0.012);
      float r3 = ring(dist, 0.76, 0.002, 0.010);
      float r4 = ring(dist, 0.60, 0.003, 0.012);
      float r5 = ring(dist, 0.40, 0.002, 0.008);
      float r6 = ring(dist, 0.20, 0.002, 0.006);
      float rings = r1 + r2 * 0.7 + r3 * 0.5 + r4 * 0.6 + r5 * 0.4 + r6 * 0.3;
      col += uColor * rings * 0.8;
      col += coreCol * (r1 * 0.5 + r4 * 0.3);

      // ── Radial tick marks (between ring 0.88 and 0.96) ──
      float tickAngle = mod(angle + PI, PI * 2.0 / 72.0);
      float tickDist = abs(tickAngle - PI / 72.0);
      float inTickZone = step(0.89, dist) * step(dist, 0.95);
      // Major ticks every 30 degrees
      float majorAngle = mod(angle + PI, PI / 6.0);
      float majorDist = abs(majorAngle - PI / 12.0);
      float majorTick = (1.0 - smoothstep(0.0, 0.012, majorDist)) * inTickZone;
      // Minor ticks every 5 degrees
      float minorAngle = mod(angle + PI, PI / 36.0);
      float minorDist = abs(minorAngle - PI / 72.0);
      float minorTick = (1.0 - smoothstep(0.0, 0.006, minorDist)) * inTickZone * 0.4;
      col += uColor * (majorTick * 0.9 + minorTick * 0.3);
      col += coreCol * majorTick * 0.4;

      // ── Crosshair reticle ──
      float crossH = line(p.y, 0.003, 0.012) * step(dist, 0.28);
      float crossV = line(p.x, 0.003, 0.012) * step(dist, 0.28);
      col += uColor * (crossH + crossV) * 0.5;
      col += coreCol * (crossH + crossV) * 0.2;

      // Centre dot
      float dot = exp(-dist * dist / 0.0004);
      col += coreCol * dot;
      col += uColor * exp(-dist * dist / 0.002) * 0.4;

      // ── Circuit arcs (partial rings, rotating) ──
      float anim = uTime * 0.8;
      float arc1a = smoothstep(-0.05, 0.0, sin(angle + anim) - 0.5) * ring(dist, 0.70, 0.003, 0.01) * 0.6;
      float arc2a = smoothstep(-0.05, 0.0, sin(angle * 2.0 - anim * 1.3) - 0.3) * ring(dist, 0.50, 0.002, 0.008) * 0.5;
      float arc3a = smoothstep(-0.05, 0.0, cos(angle * 3.0 + anim * 0.7) - 0.6) * ring(dist, 0.30, 0.002, 0.008) * 0.4;
      col += uColor * (arc1a + arc2a + arc3a);

      // ── Cardinal diamond markers ──
      for (int i = 0; i < 4; i++) {
        float a = float(i) * PI / 2.0;
        vec2 mp = vec2(cos(a), sin(a)) * 0.92;
        float md = length(p - mp);
        float diamond = exp(-md * md / 0.0003);
        col += uColor * diamond * 0.5;
      }

      // Edge fade
      float edgeFade = 1.0 - smoothstep(0.94, 1.0, dist);
      col = mix(bg, col, edgeFade);

      // Subtle pulse
      col *= 0.92 + 0.08 * sin(uTime * 1.5);

      gl_FragColor = vec4(col, alpha * uReveal);
    }
  `

  const platformGeo = new CircleGeometry(PLAT_RADIUS, 64)
  const platformMat = new ShaderMaterial({
    vertexShader: platVert,
    fragmentShader: platFrag,
    transparent: true,
    side: DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uColor: { value: new Color(0x4ad8ff) },
    },
  })
  const platform = new Mesh(platformGeo, platformMat)
  platform.name = 'HologramPlatform'
  platform.rotation.x = -Math.PI / 2
  platform.position.y = 0.02
  platformGroup.add(platform)

  // Upward PointLight — casts cyan light onto the avatar from below
  const platLight = new PointLight(0x4ad8ff, 8, 4, 1.5)
  platLight.position.set(0, 0.3, 0)
  platformGroup.add(platLight)

  // ── Laser scan ring — 3D glowing torus ──────────────────────────────
  // A thick luminescent torus ring that sweeps up through the avatar.
  const LASER_TUBE = 0.025 // tube thickness
  const laserTorusGeo = new TorusGeometry(PLAT_RADIUS * 0.92, LASER_TUBE, 16, 64)
  const laserVert = `
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      vNormal = normalize(normalMatrix * normal);
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      vViewDir = normalize(-mvPos.xyz);
      gl_Position = projectionMatrix * mvPos;
    }
  `
  const laserFrag = `
    uniform vec3 uColor;
    uniform float uTime;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    void main() {
      // Fresnel glow — brighter at edges
      float fresnel = 1.0 - abs(dot(vNormal, vViewDir));
      fresnel = pow(fresnel, 1.5);
      // Bright core + fresnel rim
      float core = 0.6;
      float glow = core + fresnel * 1.5;
      // Subtle pulse
      glow *= 0.9 + 0.1 * sin(uTime * 10.0);
      vec3 col = uColor * glow;
      // Hot white centre
      col += vec3(0.8, 0.95, 1.0) * core * 0.4;
      gl_FragColor = vec4(col, 1.0);
    }
  `
  const laserRingMat = new ShaderMaterial({
    vertexShader: laserVert,
    fragmentShader: laserFrag,
    transparent: true,
    blending: AdditiveBlending,
    depthWrite: false,
    side: DoubleSide,
    uniforms: {
      uColor: { value: new Color(0x4ad8ff) },
      uTime: { value: 0 },
    },
  })
  const laserRing = new Mesh(laserTorusGeo, laserRingMat)
  laserRing.rotation.x = Math.PI / 2 // lie flat, parallel to launch pad
  laserRing.position.y = -10 // off-screen by default
  laserRing.name = 'LaserScanRing'
  root.add(laserRing)

  // Tron-style neon line grid floor (shader-based).
  const { mesh: grid, material: gridMaterial } = buildTronGrid()
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
    platformMat.uniforms.uReveal.value = clamped
    platLight.intensity = 8 * clamped
    gridMaterial.uniforms.uOpacity.value = 0.9 * clamped
  }

  // Scroll-driven laser ring: 0 = feet, 1 = above head
  const setLaserProgress = (p: number) => {
    const y = 0.15 + p * 2.0 // feet(0.15) to above head(2.15)
    laserRing.position.y = y
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
    // Feed time to platform shader (drives arc rotation + pulse)
    platformMat.uniforms.uTime.value = elapsed
    // Feed time to the grid + laser shaders
    gridMaterial.uniforms.uTime.value = elapsed
    laserRingMat.uniforms.uTime.value = elapsed
    // Only rotate + scan when the hologram is visible (about section)
    if (!root.visible) return
    // Slowly rotate only the about-section models on the turntable
    const avatarExt = avatar as Avatar & { setAboutRotation?: (y: number) => void }
    const aboutRotY = elapsed * 1.5
    avatarExt.setAboutRotation?.(aboutRotY)
    // Wardrobe scan: each outfit gets one full rotation.
    // Over a ~2.8 rotation cycle:
    //   0.0–0.4: ramp 0→1 (slow scan to jersey)
    //   0.4–1.4: hold at 1 (jersey for one full rotation)
    //   1.4–1.8: ramp 1→0 (slow scan back to shirt)
    //   1.8–2.8: hold at 0 (shirt for one full rotation)
    const rotations = aboutRotY / (Math.PI * 2)
    const period = 2.8
    const cycle = ((rotations % period) + period) % period
    let reveal: number
    if (cycle < 0.4) reveal = cycle / 0.4
    else if (cycle < 1.4) reveal = 1
    else if (cycle < 1.8) reveal = 1 - (cycle - 1.4) / 0.4
    else reveal = 0
    avatarWithScan.setScanReveal?.(reveal)

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
    platformGeo.dispose()
    // Dispose base material + program slot.
    baseMaterial.dispose()

    root.remove(platformGroup)

    root.remove(grid)
    grid.geometry.dispose()
    gridMaterial.dispose()

    root.remove(laserRing)
    laserTorusGeo.dispose()
    laserRingMat.dispose()

    analyser = null
    audioBuffer = null
  }

  return {
    root,
    bindAnalyser,
    setReveal,
    setLaserProgress,
    dispose,
    tick,
  }
}
