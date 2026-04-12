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
  CanvasTexture,
  SRGBColorSpace,
  LinearFilter,
  MeshStandardMaterial,
  MeshBasicMaterial,
  PlaneGeometry,
  DoubleSide,
  Bone,
  type IUniform,
} from 'three'
import type { BufferGeometry, Material } from 'three'
import type { Avatar, AvatarPose, Loader } from '../contracts'

// Four outfits used across the four sections of the scroll story:
//   hero      → jersey + thinking pose          (jersey-thinking, standalone)
//   about     → wardrobe-reveal duo:
//                 v=0 jersey-about (matched standing pose)
//                 v=1 shirt-about (matched standing pose)
//   projects  → shirt-about (continues from about, v=1 hold)
//   contact   → dedicated contact outfit + pose (character-contact, snap-swap)
//
// The about-section duo uses a dedicated jersey/shirt pair that share
// the same standing pose so the bodies overlap perfectly during the
// mid-scan moment when both meshes are visible.
const JERSEY_THINKING_GLB_URL = '/models/character-jersey-thinking.glb'
const JERSEY_ABOUT_GLB_URL = '/models/character-jersey-about.glb'
const SHIRT_GLB_URL = '/models/character-shirt.glb'
const CONTACT_GLB_URL = '/models/character-contact.glb'

// ─── CHIRAG 10 jersey-back texture ─────────────────────────────────────
function makeChirag10Texture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 384
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  // Tight, centered "CHIRAG" name + "10" number, slightly smaller than v1
  // so it sits naturally between the shoulder blades instead of looking
  // like a giant decal slapped on the back.
  ctx.fillStyle = '#0b1b3a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.font = 'bold 56px sans-serif'
  ctx.fillText('CHIRAG', canvas.width / 2, 80)

  ctx.font = 'bold 200px sans-serif'
  ctx.fillText('10', canvas.width / 2, 240)

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.generateMipmaps = false
  return tex
}

/**
 * Builds a Mesh that wears the CHIRAG 10 print on the back of a jersey
 * mesh. Sized small (0.26 x 0.20 m) and meant to be parented to the
 * `Spine2` chest bone via `pinChirag10ToChestBone(model)` so it deforms
 * with the bundled animation instead of staying at the static root.
 */
function makeChirag10Plane(): Mesh {
  const tex = makeChirag10Texture()
  const plane = new Mesh(
    new PlaneGeometry(0.26, 0.2),
    new MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: DoubleSide,
      depthWrite: false,
      depthTest: false,
    }),
  )
  plane.renderOrder = 999
  return plane
}

/**
 * Finds the `Spine2` chest bone in the rig and parents a CHIRAG 10
 * plane to it. The plane sits ~14 cm "behind" the bone in its local
 * space and faces the bone's local -Z. When the bundled animation
 * rotates/translates Spine2 (the avatar leans, twists, breathes), the
 * plane follows in lock-step — exactly what "pin to back" means.
 */
function pinChirag10ToChestBone(model: Object3D): Mesh | null {
  const spine2 = findByName(model, 'Spine2') as Bone | null
  if (!spine2) {
    console.warn('[Avatar] Spine2 bone not found — chirag plane skipped')
    return null
  }
  const plane = makeChirag10Plane()
  // In the Mixamo/Avaturn rig, Spine2's local axes are: +Y along the
  // spine (toward the head), +Z forward (body's front), -Z back. The
  // chest centre is roughly at the bone origin; the back surface is
  // ~12 cm in -Z. We position a bit further out (-0.14) to clear the
  // body in deformed poses.
  plane.position.set(0, 0.05, -0.14)
  // Rotate so the plane's local normal points toward -Z (the back).
  plane.rotation.y = Math.PI
  spine2.add(plane)
  return plane
}

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

  const [thinkingGltf, jerseyAboutGltf, shirtGltf, contactGltf] =
    await Promise.all([
      loader.load(JERSEY_THINKING_GLB_URL),
      loader.load(JERSEY_ABOUT_GLB_URL),
      loader.load(SHIRT_GLB_URL),
      loader.load(CONTACT_GLB_URL),
    ])
  const thinkingModel = thinkingGltf.scene // hero (jersey + thinking pose)
  const jerseyAboutModel = jerseyAboutGltf.scene // about scan v=0 (matched-pose jersey)
  const shirtModel = shirtGltf.scene // about scan v=1 (matched-pose shirt)
  const contactModel = contactGltf.scene // contact (dedicated contact outfit + pose)

  // Single shared uniforms object — drives the scan effect on every body
  // material across the wardrobe-reveal duo (jersey-about ↔ shirt).
  const uniforms = makeSharedUniforms()

  // Wardrobe-reveal duo: jersey-about is the default (v=0), shirt is the
  // alternate (v=1). They share the same standing pose so the bodies
  // overlap perfectly mid-scan. Hero thinking + contact jersey are
  // standalone meshes outside the scan — snap-swapped by visibility.
  prepareModel(jerseyAboutModel, uniforms, false)
  prepareModel(shirtModel, uniforms, true)

  // Hero thinking pose: shadows + scene parenting only, no shader injection.
  thinkingModel.traverse((obj) => {
    const mesh = obj as Mesh
    if ((mesh as unknown as { isMesh?: boolean }).isMesh) {
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
  })

  // Contact jersey: shadows + scene parenting only, no shader injection.
  contactModel.traverse((obj) => {
    const mesh = obj as Mesh
    if ((mesh as unknown as { isMesh?: boolean }).isMesh) {
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
  })

  root.add(thinkingModel)
  root.add(jerseyAboutModel)
  root.add(shirtModel)
  root.add(contactModel)

  // ── CHIRAG 10 jersey-back overlay (hero only) ──────────────────────────
  // Pinned to the Spine2 chest bone so it deforms with the bundled
  // animation. The about-section jersey-about mesh and the contact
  // model do NOT get one — about scan stays clean, contact wears its
  // own outfit.
  pinChirag10ToChestBone(thinkingModel)

  // ── Animation mixers (one per model). Each plays the bundled
  //    avaturn_animation clip baked into its own GLB. The thinking pose
  //    has a different clip than the standing jersey, so they animate
  //    independently — but the wardrobe-reveal duo (thinking ↔ shirt)
  //    relies on near-stationary poses so the visible difference between
  //    the two during the scan is minimal.
  const thinkingMixer = new AnimationMixer(thinkingModel)
  const jerseyAboutMixer = new AnimationMixer(jerseyAboutModel)
  const shirtMixer = new AnimationMixer(shirtModel)
  const contactMixer = new AnimationMixer(contactModel)

  let activeClip: AnimationClip | null = null
  if (thinkingGltf.animations.length > 0) {
    activeClip = thinkingGltf.animations[0]
    thinkingMixer.clipAction(activeClip).play()
  }
  if (jerseyAboutGltf.animations.length > 0) {
    jerseyAboutMixer.clipAction(jerseyAboutGltf.animations[0]).play()
  }
  if (shirtGltf.animations.length > 0) {
    shirtMixer.clipAction(shirtGltf.animations[0]).play()
  }
  if (contactGltf.animations.length > 0) {
    contactMixer.clipAction(contactGltf.animations[0]).play()
  }

  // ── Find the head bone (use the thinking mesh; bones are equivalent
  //    on all three rigs since they share the same skeleton).
  const headBone = (findByName(thinkingModel, 'head') ?? null) as Bone | null

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

  // ── Wardrobe-reveal + contact-swap drivers ─────────────────────────────
  // The scan operates on the matched-pose duo (jersey-about ↔ shirt).
  // The hero thinking pose and contact jersey are independent meshes,
  // toggled by setHeroThinking/setShowContact.
  //
  //   scan v=0       → jersey-about visible, shirt hidden
  //   scan v=1       → shirt visible, jersey-about hidden
  //   scan 0<v<1     → both visible, scan band glowing in between
  //   hero (thinking)→ thinking visible, scan duo + contact hidden
  //   contact        → contact jersey visible, scan duo + thinking hidden
  const SCAN_TOP = 2.0 // ~head height + a margin
  const SCAN_BOTTOM = -0.05 // just under the feet
  let isContactSwap = false
  let isHeroThinking = true // start in hero pose

  const refreshDuoVisibility = (): void => {
    if (isContactSwap || isHeroThinking) {
      jerseyAboutModel.visible = false
      shirtModel.visible = false
      return
    }
    const v = uniforms.uScanReveal.value
    if (v <= 0.001) {
      jerseyAboutModel.visible = true
      shirtModel.visible = false
    } else if (v >= 0.999) {
      jerseyAboutModel.visible = false
      shirtModel.visible = true
    } else {
      jerseyAboutModel.visible = true
      shirtModel.visible = true
    }
  }

  const setScanReveal = (v: number): void => {
    const clamped = MathUtils.clamp(v, 0, 1)
    uniforms.uScanReveal.value = clamped
    uniforms.uScanY.value = MathUtils.lerp(SCAN_TOP, SCAN_BOTTOM, clamped)
    refreshDuoVisibility()
  }

  const setShowContact = (on: boolean): void => {
    isContactSwap = on
    if (on) {
      thinkingModel.visible = false
      contactModel.visible = true
    } else {
      contactModel.visible = false
    }
    refreshDuoVisibility()
  }

  // Hero pose toggle: when on, only the thinking jersey shows; when off,
  // the scan duo takes over (used by the per-section state machine in
  // timeline.ts so hero stays a single pose with no scan effects).
  const setHeroThinking = (on: boolean): void => {
    isHeroThinking = on
    thinkingModel.visible = on && !isContactSwap
    refreshDuoVisibility()
  }

  // Default state: hero (thinking pose), contact swap off
  contactModel.visible = false
  thinkingModel.visible = true
  setScanReveal(0)

  // ── Tick: advance all four mixers + the time uniform ─────────────────
  const tick = (dt: number, elapsed: number): void => {
    if (thinkingModel.visible) thinkingMixer.update(dt)
    if (jerseyAboutModel.visible) jerseyAboutMixer.update(dt)
    if (shirtModel.visible) shirtMixer.update(dt)
    if (contactModel.visible) contactMixer.update(dt)
    uniforms.uTime.value = elapsed

    if (!headTrackingActive && headBone) {
      headBone.rotation.copy(baseHeadRot)
    }
  }

  // ── Dispose ────────────────────────────────────────────────────────────
  const dispose = (): void => {
    thinkingMixer.stopAllAction()
    jerseyAboutMixer.stopAllAction()
    shirtMixer.stopAllAction()
    contactMixer.stopAllAction()
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
  // mixer field on the contract: hand back the thinking mixer (the
  // canonical reference for the hero pose; orchestrator code that pokes
  // at the mixer can use this one).
  return {
    root,
    mixer: thinkingMixer,
    play,
    lookAt,
    applyJersey,
    setScanReveal,
    setShowContact,
    setHeroThinking,
    dispose,
    tick,
  }
}
