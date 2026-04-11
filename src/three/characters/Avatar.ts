/**
 * Avatar.ts — Phase 7C+ — Dual-mesh wardrobe-reveal avatar.
 *
 * Loads TWO Avaturn exports of the same character base — one in the
 * Argentina #10 home jersey (`character-jersey.glb`) and one in a plain
 * white casual shirt (`character-shirt.glb`). Both meshes are added at the
 * same world position with their own animation mixers playing the bundled
 * `avaturn_animation` clip in lock-step.
 *
 * The wardrobe progression across the scroll story:
 *   hero      → jersey (default v=0)
 *   about     → scan reveals shirt (v 0→1 driven by master timeline)
 *   projects  → shirt (v=1 hold)
 *   contact   → snap back to jersey (v 1→0 driven by projects→contact tween)
 *
 * Implementation: shared uniforms `uScanY` (current scan position in
 * world Y) and `uScanReveal` (0..1 master mix) are injected into both
 * meshes' `MeshStandardMaterial` via `onBeforeCompile`. Above the scan
 * line the jersey mesh discards. Below the scan line the shirt mesh
 * discards. A bright cyan band glows on whichever mesh is rendering it.
 *
 * Because the underlying material is still `MeshStandardMaterial`, all
 * Three.js features (PBR lighting, IBL, shadow casting, skinning) keep
 * working — we're just adding a per-fragment discard + glow on top.
 *
 * `setScanReveal(v)` is the public driver; `setScanReveal(0)` = pure
 * jersey everywhere, `setScanReveal(1)` = pure white shirt everywhere, in
 * between = the scan in progress. The Hologram FX layer in `Hologram.ts`
 * calls this from its own `setReveal()` so the existing GSAP timeline
 * doesn't need to know about the dual-mesh trick.
 *
 * Owned by W7 (rewritten for Phase 7C+).
 */

import {
  Group,
  Mesh,
  Object3D,
  AnimationMixer,
  AnimationClip,
  Vector3,
  Euler,
  MathUtils,
  MeshStandardMaterial,
  Bone,
  type IUniform,
} from 'three'
import type { BufferGeometry, Material } from 'three'
import type { Avatar, AvatarPose, Loader } from '../contracts'

const JERSEY_GLB_URL = '/models/character-jersey.glb'
const SHIRT_GLB_URL = '/models/character-shirt.glb'

// ─── Helper: find a child by name (case-insensitive substring) ────────────

function findByName(root: Object3D, needle: string): Object3D | null {
  const lower = needle.toLowerCase()
  let found: Object3D | null = null
  root.traverse((obj) => {
    if (found) return
    if (obj.name.toLowerCase().includes(lower)) {
      found = obj
    }
  })
  return found
}

// ─── Custom uniforms shared across every body material ───────────────────

interface SharedScanUniforms {
  uScanY: IUniform<number>
  uScanReveal: IUniform<number>
  uTime: IUniform<number>
  uScanColor: IUniform<[number, number, number]>
}

function makeSharedUniforms(): SharedScanUniforms {
  return {
    uScanY: { value: 100 }, // way above the head — no effect by default
    uScanReveal: { value: 0 },
    uTime: { value: 0 },
    uScanColor: { value: [0.29, 0.85, 1.0] }, // #4ad8ff cyan
  }
}

// ─── onBeforeCompile injection ─────────────────────────────────────────────

/**
 * Patches a `MeshStandardMaterial` so it discards above OR below a
 * world-Y scan line based on whether this material belongs to the
 * "default" outfit (jersey, v=0) or the "alternate" outfit (shirt, v=1),
 * and draws a bright cyan band at the scan threshold itself.
 *
 * `isAlternate` flag:
 *   false → jersey material; visible when scan line is ABOVE the fragment
 *   true  → shirt material;  visible when scan line is BELOW the fragment
 *
 * The shared `uniforms` object is reused across every material so a single
 * `uniforms.uScanY.value = ...` ripples through every body mesh of both
 * outfits at the same time.
 */
function injectScanReveal(
  mat: MeshStandardMaterial,
  uniforms: SharedScanUniforms,
  isAlternate: boolean,
): void {
  const cacheKey = isAlternate ? 'avatar-shirt-scan' : 'avatar-jersey-scan'

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uScanY = uniforms.uScanY
    shader.uniforms.uScanReveal = uniforms.uScanReveal
    shader.uniforms.uTime = uniforms.uTime
    shader.uniforms.uScanColor = uniforms.uScanColor
    shader.uniforms.uIsAlternate = { value: isAlternate ? 1.0 : 0.0 }

    // VERTEX: forward bone-deformed world Y to the fragment shader.
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
varying float vScanWorldY;`,
    )
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
{
  vec4 _scanWorldPos = modelMatrix * vec4(transformed, 1.0);
  vScanWorldY = _scanWorldPos.y;
}`,
    )

    // FRAGMENT: discard + glow band at the scan threshold.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
uniform float uScanY;
uniform float uScanReveal;
uniform float uTime;
uniform vec3 uScanColor;
uniform float uIsAlternate;
varying float vScanWorldY;`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
{
  // While the scan is active (0 < uScanReveal < 1), exactly one of the
  // two outfits is rendered per fragment so they never overlap.
  // uScanReveal = 0 → pure jersey (default outfit)
  // uScanReveal = 1 → pure shirt (alternate outfit)
  // The scan line travels from above-head (v=0) down to below-feet (v=1).
  if (uScanReveal > 0.001 && uScanReveal < 0.999) {
    float scanLine = uScanY;
    if (uIsAlternate > 0.5) {
      // Shirt: visible ABOVE the scan line (revealed first as scan moves down).
      if (vScanWorldY < scanLine) discard;
    } else {
      // Jersey: visible BELOW the scan line.
      if (vScanWorldY > scanLine) discard;
    }
    // Cyan glow band right at the threshold (~15 cm thick falloff for a
    // chunkier, more cinematic beam).
    float dist = abs(vScanWorldY - scanLine);
    float band = 1.0 - smoothstep(0.0, 0.15, dist);
    // Pulse the band brightness with time so it reads as an active scan.
    float pulse = 0.85 + 0.15 * sin(uTime * 8.0);
    gl_FragColor.rgb += uScanColor * band * 3.0 * pulse;
  }
}`,
    )
  }
  // Force a fresh compile per variant so Three.js doesn't reuse the
  // un-injected base shader.
  mat.customProgramCacheKey = () => cacheKey
  mat.needsUpdate = true
}

// ─── Setup helpers ─────────────────────────────────────────────────────────

function prepareModel(
  model: Group,
  uniforms: SharedScanUniforms,
  isAlternate: boolean,
): void {
  model.traverse((obj) => {
    const mesh = obj as Mesh
    if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    const material = mesh.material as Material | Material[]
    if (Array.isArray(material)) {
      for (const m of material) {
        if (m instanceof MeshStandardMaterial)
          injectScanReveal(m, uniforms, isAlternate)
      }
    } else if (material instanceof MeshStandardMaterial) {
      injectScanReveal(material, uniforms, isAlternate)
    }
  })
}

// ─── Main factory ─────────────────────────────────────────────────────────

export async function loadAvatar(
  loader: Loader,
  _glbUrl: string,
): Promise<Avatar & { tick: (dt: number, elapsed: number) => void }> {
  // _glbUrl is ignored; the dual-mesh wardrobe reveal always loads both
  // characters from the canonical paths.
  const root = new Group()
  root.name = 'Avatar'

  const [jerseyGltf, shirtGltf] = await Promise.all([
    loader.load(JERSEY_GLB_URL),
    loader.load(SHIRT_GLB_URL),
  ])
  const jerseyModel = jerseyGltf.scene
  const shirtModel = shirtGltf.scene

  // Single shared uniforms object — drives the scan effect on every body
  // material across both outfits in lock-step.
  const uniforms = makeSharedUniforms()

  prepareModel(jerseyModel, uniforms, false) // jersey = default (v=0)
  prepareModel(shirtModel, uniforms, true) // shirt = alternate (v=1)

  root.add(jerseyModel)
  root.add(shirtModel)

  // ── Animation mixers (one per model — they share the same clip data so
  //    starting them together keeps them in sync).
  const jerseyMixer = new AnimationMixer(jerseyModel)
  const shirtMixer = new AnimationMixer(shirtModel)

  let activeClip: AnimationClip | null = null
  if (jerseyGltf.animations.length > 0) {
    activeClip = jerseyGltf.animations[0]
    jerseyMixer.clipAction(activeClip).play()
  }
  if (shirtGltf.animations.length > 0) {
    shirtMixer.clipAction(shirtGltf.animations[0]).play()
  }

  // ── Find the head bone (use the jersey mesh; bones are equivalent on
  //    both rigs since they share the same skeleton).
  const headBone = (findByName(jerseyModel, 'head') ?? null) as Bone | null

  // ── Pose state (no-op for now; bundled clip is the only motion source) ─
  let currentPose: AvatarPose = 'standing'
  const play = (pose: AvatarPose): void => {
    if (pose === currentPose) return
    currentPose = pose
    // TODO(phase7-mixamo): cross-fade between sit/stand/celebration/stretch
  }

  // ── Cursor head-tracking ───────────────────────────────────────────────
  const headTarget = new Vector3()
  const tmpEuler = new Euler()
  const baseHeadRot = new Euler()
  if (headBone) baseHeadRot.copy(headBone.rotation)
  const YAW_CLAMP = MathUtils.degToRad(25)
  const PITCH_CLAMP = MathUtils.degToRad(15)
  let headTrackingActive = false

  const lookAt = (worldX: number, worldY: number, worldZ: number): void => {
    if (!headBone) return
    headTrackingActive = true
    headTarget.set(worldX, worldY, worldZ)
    headBone.updateWorldMatrix(true, false)
    headBone.lookAt(headTarget)
    tmpEuler.setFromQuaternion(headBone.quaternion, 'YXZ')
    tmpEuler.y = MathUtils.clamp(tmpEuler.y, -YAW_CLAMP, YAW_CLAMP)
    tmpEuler.x = MathUtils.clamp(tmpEuler.x, -PITCH_CLAMP, PITCH_CLAMP)
    tmpEuler.z = 0
    headBone.rotation.copy(tmpEuler)
  }

  // ── Jersey override is now redundant — the GLB already wears the
  //    Argentina jersey. Kept as a no-op so the contract is satisfied.
  const applyJersey = (): void => {
    /* GLB-baked, nothing to do */
  }

  // ── Wardrobe-reveal scan driver ────────────────────────────────────────
  // v=0 → jersey visible, shirt mesh hidden entirely (no overdraw)
  // v=1 → shirt visible, jersey mesh hidden entirely
  // 0<v<1 → both meshes visible, scan line in progress, shader discards
  //         the hidden half on a per-fragment basis
  const SCAN_TOP = 2.0 // ~head height + a margin
  const SCAN_BOTTOM = -0.05 // just under the feet
  const setScanReveal = (v: number): void => {
    const clamped = MathUtils.clamp(v, 0, 1)
    uniforms.uScanReveal.value = clamped
    uniforms.uScanY.value = MathUtils.lerp(SCAN_TOP, SCAN_BOTTOM, clamped)
    if (clamped <= 0.001) {
      jerseyModel.visible = true
      shirtModel.visible = false
    } else if (clamped >= 0.999) {
      jerseyModel.visible = false
      shirtModel.visible = true
    } else {
      jerseyModel.visible = true
      shirtModel.visible = true
    }
  }
  // Default state: pure jersey (matches hero)
  setScanReveal(0)

  // ── Tick: advance both mixers + the time uniform ──────────────────────
  const tick = (dt: number, elapsed: number): void => {
    jerseyMixer.update(dt)
    shirtMixer.update(dt)
    uniforms.uTime.value = elapsed

    if (!headTrackingActive && headBone) {
      headBone.rotation.copy(baseHeadRot)
    }
  }

  // ── Dispose ────────────────────────────────────────────────────────────
  const dispose = (): void => {
    jerseyMixer.stopAllAction()
    shirtMixer.stopAllAction()
    root.traverse((obj: Object3D) => {
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
  }

  // The orchestrator wires this through the unified Avatar contract.
  // mixer field on the contract: hand back the jersey mixer (the shirt
  // one is in lock-step so any external code that pokes at the mixer
  // can use this one as the canonical reference).
  return {
    root,
    mixer: jerseyMixer,
    play,
    lookAt,
    applyJersey,
    setScanReveal,
    dispose,
    tick,
  }
}
