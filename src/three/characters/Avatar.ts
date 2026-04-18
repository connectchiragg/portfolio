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
  Box3,
  FrontSide,
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

  // Centered "CHIRAG" name + "10" number — sized to be clearly
  // readable on the jersey back during the turntable rotation.
  ctx.fillStyle = '#0b1b3a'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  ctx.font = 'bold 72px sans-serif'
  ctx.fillText('CHIRAG', canvas.width / 2, 75)

  ctx.font = 'bold 240px sans-serif'
  ctx.fillText('10', canvas.width / 2, 245)

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
    new PlaneGeometry(0.32, 0.25),
    new MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: FrontSide,
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
  // Pin to Spine (mid-back) so the label sits between the shoulder blades
  const spine = (findByName(model, 'Spine2') ?? findByName(model, 'Spine1') ?? findByName(model, 'Spine')) as Bone | null
  if (!spine) {
    console.warn('[Avatar] Spine bone not found — chirag plane skipped')
    return null
  }
  const plane = makeChirag10Plane()
  // Position behind the bone (-Z = back). Offset further out to clear
  // the body mesh in deformed poses.
  plane.position.set(0, 0.05, -0.14)
  // Rotate so the plane's local normal points toward -Z (the back).
  plane.rotation.y = Math.PI
  spine.add(plane)
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
  uLaserY: IUniform<number>
}

function makeSharedUniforms(): SharedScanUniforms {
  return {
    uScanY: { value: 100 }, // way above the head — no effect by default
    uScanReveal: { value: 0 },
    uTime: { value: 0 },
    uScanColor: { value: [0.29, 0.85, 1.0] }, // #4ad8ff cyan
    uLaserY: { value: -10 }, // off-screen by default
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
    shader.uniforms.uLaserY = uniforms.uLaserY

    // VERTEX: forward bone-deformed world position to the fragment shader.
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>',
      `#include <common>
varying float vScanWorldY;
varying vec3 vScanWorldPos;`,
    )
    shader.vertexShader = shader.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
{
  vec4 _scanWorldPos = modelMatrix * vec4(transformed, 1.0);
  vScanWorldY = _scanWorldPos.y;
  vScanWorldPos = _scanWorldPos.xyz;
}`,
    )

    // FRAGMENT: crystallic dissolution at the scan threshold.
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>',
      `#include <common>
uniform float uScanY;
uniform float uScanReveal;
uniform float uTime;
uniform vec3 uScanColor;
uniform float uIsAlternate;
varying float vScanWorldY;
varying vec3 vScanWorldPos;

// Hash for crystalline Voronoi noise
vec3 _hash3(vec3 p) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return fract(sin(p) * 43758.5453);
}

// Voronoi distance — returns distance to nearest cell edge
// giving a crystalline / shattered glass pattern
float voronoi(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float minDist = 1.0;
  float secondDist = 1.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 neighbor = vec3(float(x), float(y), float(z));
        vec3 point = _hash3(i + neighbor);
        vec3 diff = neighbor + point - f;
        float d = dot(diff, diff);
        if (d < minDist) {
          secondDist = minDist;
          minDist = d;
        } else if (d < secondDist) {
          secondDist = d;
        }
      }
    }
  }
  // Edge distance (difference between closest and second-closest)
  return sqrt(secondDist) - sqrt(minDist);
}`,
    )
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
{
  if (uScanReveal > 0.001 && uScanReveal < 0.999) {
    float scanLine = uScanY;
    float d = vScanWorldY - scanLine;

    // Crystalline noise at the fragment's world position
    float crystal = voronoi(vScanWorldPos * 30.0);

    // Dissolution zone: fragments within ±0.25 of scan line dissolve
    // based on crystalline noise threshold
    float dissolveWidth = 0.25;
    float normalizedDist;

    if (uIsAlternate > 0.5) {
      // Shirt: visible ABOVE scan line
      normalizedDist = -d / dissolveWidth; // -1 (far below) to +1 (far above)
    } else {
      // Jersey: visible BELOW scan line
      normalizedDist = d / dissolveWidth;  // -1 (far above) to +1 (far below)
    }

    // Outside dissolution zone: hard show/hide
    if (normalizedDist > 1.0) discard;

    // Inside dissolution zone: crystalline breakup
    if (normalizedDist > 0.0) {
      // Threshold increases toward the discard side
      float threshold = normalizedDist;
      // Fragments with crystal value below threshold survive
      if (crystal < threshold * 0.8) discard;
    }

    // Glowing crystal edges at the dissolution boundary
    float edgeDist = abs(d);
    float inZone = 1.0 - smoothstep(0.0, dissolveWidth, edgeDist);

    // Crystal edge highlights — bright where Voronoi edges are thin
    float crystalEdge = 1.0 - smoothstep(0.0, 0.15, crystal);
    float edgeGlow = crystalEdge * inZone;

    // Bright scan line
    float scanBand = exp(-edgeDist * edgeDist / 0.003);

    // Pulse
    float pulse = 0.85 + 0.15 * sin(uTime * 8.0);

    // Combine: crystal edges glow cyan, scan line glows bright
    vec3 glow = uScanColor * (edgeGlow * 2.0 + scanBand * 4.0) * pulse;

    // Emissive sparkle on surviving crystal fragments near the edge
    float sparkle = step(0.7, crystal) * inZone * 3.0;
    glow += vec3(0.8, 0.95, 1.0) * sparkle * pulse;

    gl_FragColor.rgb += glow;
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

  // ── CHIRAG 10 jersey-back overlay ──────────────────────────────────────
  // Pinned to the Spine2 chest bone so it deforms with the bundled
  // animation. Applied to both the hero jersey and the about-section
  // jersey so the number is visible during the turntable rotation.
  const chirag10Hero = pinChirag10ToChestBone(thinkingModel)
  const chirag10About = pinChirag10ToChestBone(jerseyAboutModel)

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
  // Soccer ball positioned at the palm center — computed from finger bones
  // each frame so it tracks correctly regardless of bone local axis orientation.
  const palmBones = ['LeftHand']
    .map(name => findByName(contactModel, name) as Bone | null)
    .filter((b): b is Bone => b !== null)

  let handBall: Group | null = null
  if (palmBones.length > 0) {
    const footballGltf = await loader.load('/models/football.glb')
    handBall = footballGltf.scene
    handBall.name = 'HandBall'
    // Scale to real football size (~22cm diameter)
    // Measure the GLB's bounding box to get the right scale
    const box = new Box3().setFromObject(handBall)
    const size = new Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    const targetDiameter = 0.22
    const s = targetDiameter / maxDim
    handBall.scale.setScalar(s)
    handBall.traverse((obj) => {
      const mesh = obj as Mesh
      if ((mesh as unknown as { isMesh?: boolean }).isMesh) {
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })
    root.add(handBall)
    handBall.visible = false
  }

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
  const SCAN_TOP = 2.3 // ~head height + generous margin (avatar lifted 0.15)
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
    // Hide CHIRAG 10 labels when shirt is showing (reveal > 0.5)
    const jerseyVisible = clamped < 0.05
    if (chirag10Hero) chirag10Hero.visible = jerseyVisible
    if (chirag10About) chirag10About.visible = jerseyVisible
    refreshDuoVisibility()
  }

  // Scroll-driven laser disc position (0=feet, 1=head)
  const setLaserProgress = (p: number): void => {
    const clamped = MathUtils.clamp(p, 0, 1)
    uniforms.uLaserY.value = MathUtils.lerp(SCAN_BOTTOM, SCAN_TOP, clamped)
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

    // Position the football at the average of the finger knuckle world positions
    if (handBall && contactModel.visible && palmBones.length > 0) {
      handBall.visible = true
      const avg = new Vector3()
      for (const bone of palmBones) {
        const wp = new Vector3()
        bone.getWorldPosition(wp)
        avg.add(wp)
      }
      avg.divideScalar(palmBones.length)
      // Shift down so the ball sits under the forearm/wrist
      avg.y -= 0.12
      avg.x -= 0.03  // slightly left
      avg.z -= 0.035  // slightly behind fingers
      // Convert world position to the ball's parent (root) local space
      root.worldToLocal(avg)
      handBall.position.copy(avg)
    } else if (handBall) {
      handBall.visible = false
    }

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
  // Rotate only the about-section models (jersey + shirt scan duo).
  // Does not affect hero thinking or contact poses.
  // Rotate duo around body center, not skeleton origin (right foot).
  // Offset the models so the body centroid sits at (0,0,0) in the
  // pivot group, then rotate the pivot.
  const aboutPivot = new Group()
  aboutPivot.name = 'AboutPivot'
  root.add(aboutPivot)
  // Re-parent duo models from root into pivot
  root.remove(jerseyAboutModel)
  root.remove(shirtModel)
  aboutPivot.add(jerseyAboutModel)
  aboutPivot.add(shirtModel)
  // Skeleton origin is at right foot. Body center is slightly left.
  // Shift models right so pivot origin = body center.
  // We'll tune this value — start with 0.08.
  jerseyAboutModel.position.set(-0.25, 0, 0)
  shirtModel.position.set(-0.25, 0, 0)

  const setAboutRotation = (y: number): void => {
    aboutPivot.rotation.y = y
  }

  return {
    root,
    mixer: thinkingMixer,
    play,
    lookAt,
    applyJersey,
    setScanReveal,
    setLaserProgress,
    setShowContact,
    setHeroThinking,
    setAboutRotation,
    dispose,
    tick,
  }
}
