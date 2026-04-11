/**
 * Avatar.ts — Phase 3 primitive avatar for the "Late Night, Bengaluru"
 * portfolio. Builds a stylised low-poly humanoid out of Three.js primitives
 * (Box/Sphere/Cylinder), wearing the Argentina #10 jersey painted via a
 * procedural CanvasTexture. Exposes the W7 `Avatar` contract plus a bonus
 * `tick(dt, elapsed)` method (mirrors the W6 Hologram convention) that the
 * orchestrator wires into the main render tick.
 *
 * Pose transitions (`sitting`, `standing`, `celebration`, `stretch`) are
 * faked via GSAP tweens over the joint rotations — no Mixamo clips, no GLB
 * load. When the real Avaturn glb arrives, swap the body builder inside
 * `loadAvatar()` and keep the rest.
 *
 * Owned by W7.
 */

import {
  Group,
  Mesh,
  Object3D,
  BoxGeometry,
  SphereGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  CanvasTexture,
  SRGBColorSpace,
  LinearFilter,
  AnimationMixer,
  Euler,
  Vector3,
  MathUtils,
} from 'three'
import type { BufferGeometry, Material } from 'three'
import gsap from 'gsap'
import type { Avatar, AvatarPose, Loader } from '../contracts'

// ─── Jersey texture (module-level, generated once) ────────────────────────

const JERSEY_SKY = '#75aadb'
const JERSEY_WHITE = '#ffffff'
const JERSEY_INK = '#0b1b3a'

function makeJerseyFrontTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  // vertical stripes
  const stripeCount = 8
  const stripeW = canvas.width / stripeCount
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? JERSEY_SKY : JERSEY_WHITE
    ctx.fillRect(i * stripeW, 0, stripeW + 1, canvas.height)
  }
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.generateMipmaps = false
  return tex
}

function makeJerseyBackTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const stripeCount = 8
  const stripeW = canvas.width / stripeCount
  for (let i = 0; i < stripeCount; i++) {
    ctx.fillStyle = i % 2 === 0 ? JERSEY_SKY : JERSEY_WHITE
    ctx.fillRect(i * stripeW, 0, stripeW + 1, canvas.height)
  }
  // "CHIRAG" label
  ctx.fillStyle = JERSEY_INK
  ctx.font = 'bold 26px sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('CHIRAG', canvas.width / 2, 70)
  // big "10"
  ctx.font = 'bold 130px sans-serif'
  ctx.fillText('10', canvas.width / 2, 160)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.generateMipmaps = false
  return tex
}

// ─── Pose definitions (rotations in radians) ──────────────────────────────

interface JointTargets {
  torsoRotX: number
  headRotX: number
  headRotY: number
  leftArmRotX: number
  leftArmRotZ: number
  rightArmRotX: number
  rightArmRotZ: number
  leftLegRotX: number
  rightLegRotX: number
}

const POSES: Record<AvatarPose, JointTargets> = {
  standing: {
    torsoRotX: 0,
    headRotX: 0,
    headRotY: 0,
    // arms crossed: rotate inward on Z, slight forward angle on X
    leftArmRotX: -0.2,
    leftArmRotZ: -1.1,
    rightArmRotX: -0.2,
    rightArmRotZ: 1.1,
    leftLegRotX: 0,
    rightLegRotX: 0,
  },
  sitting: {
    torsoRotX: MathUtils.degToRad(5),
    headRotX: MathUtils.degToRad(-5),
    headRotY: 0,
    // arms forward (typing)
    leftArmRotX: -1.3,
    leftArmRotZ: -0.2,
    rightArmRotX: -1.3,
    rightArmRotZ: 0.2,
    // hips/legs fold forward (pseudo-seated)
    leftLegRotX: -MathUtils.degToRad(85),
    rightLegRotX: -MathUtils.degToRad(85),
  },
  celebration: {
    torsoRotX: MathUtils.degToRad(-5),
    headRotX: MathUtils.degToRad(10),
    headRotY: 0,
    // right arm raised high
    leftArmRotX: 0.1,
    leftArmRotZ: -0.3,
    rightArmRotX: 0,
    rightArmRotZ: 2.6,
    leftLegRotX: 0,
    rightLegRotX: 0,
  },
  stretch: {
    torsoRotX: MathUtils.degToRad(-3),
    headRotX: MathUtils.degToRad(15),
    headRotY: 0,
    // both arms straight up
    leftArmRotX: 0,
    leftArmRotZ: -Math.PI,
    rightArmRotX: 0,
    rightArmRotZ: Math.PI,
    leftLegRotX: 0,
    rightLegRotX: 0,
  },
}

// ─── Main factory ─────────────────────────────────────────────────────────

export function loadAvatar(loader: Loader, glbUrl: string): Promise<Avatar> {
  // TODO(phase3-glb): when public/models/character.glb exists, replace the
  // primitive build with: const { scene } = await loader.load(glbUrl); root.add(scene)
  const _loader = loader
  const _glbUrl = glbUrl
  void _loader
  void _glbUrl

  const root = new Group()
  root.name = 'Avatar'

  // ── Torso with per-face jersey materials (BoxGeometry groups: +x,-x,+y,-y,+z,-z)
  const jerseyFront = makeJerseyFrontTexture()
  const jerseyBack = makeJerseyBackTexture()
  const jerseySolid = new MeshStandardMaterial({ color: JERSEY_SKY, roughness: 0.8 })
  const matFront = new MeshStandardMaterial({ map: jerseyFront, roughness: 0.8 })
  const matBack = new MeshStandardMaterial({ map: jerseyBack, roughness: 0.8 })
  const torsoGeo = new BoxGeometry(0.5, 0.7, 0.25)
  const torsoMesh = new Mesh(torsoGeo, [
    jerseySolid, // +X right side
    jerseySolid, // -X left side
    jerseySolid, // +Y top
    jerseySolid, // -Y bottom
    matFront, // +Z front
    matBack, // -Z back
  ])
  torsoMesh.castShadow = true
  torsoMesh.receiveShadow = true

  // Torso pivot: rotate about the hips (bottom of box). Use a group whose
  // origin sits at hip-height and stash the mesh offset inside.
  const torso = new Group()
  torso.name = 'AvatarTorso'
  torso.position.set(0, 1.0, 0)
  torsoMesh.position.set(0, 0.35, 0) // so torso bottom sits at the hip pivot
  torso.add(torsoMesh)

  // ── Head
  const skinMat = new MeshStandardMaterial({ color: '#e8b890', roughness: 0.7 })
  const headMesh = new Mesh(new SphereGeometry(0.18, 16, 16), skinMat)
  headMesh.castShadow = true
  const head = new Group()
  head.name = 'AvatarHead'
  // Head sits atop the torso mesh (torso-local y ~= 0.7 + 0.18 offset from hips)
  head.position.set(0, 0.88, 0)
  head.add(headMesh)

  // Eyes
  const eyeMat = new MeshStandardMaterial({ color: '#0b0b0b', roughness: 0.4 })
  const leftEye = new Mesh(new SphereGeometry(0.025, 8, 8), eyeMat)
  leftEye.position.set(-0.055, 0.02, 0.16)
  const rightEye = new Mesh(new SphereGeometry(0.025, 8, 8), eyeMat)
  rightEye.position.set(0.055, 0.02, 0.16)
  headMesh.add(leftEye)
  headMesh.add(rightEye)

  // Hair (half-sphere-ish via scaled sphere clipped by position)
  const hairMat = new MeshStandardMaterial({ color: '#2a1a10', roughness: 0.9 })
  const hair = new Mesh(new SphereGeometry(0.19, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2), hairMat)
  hair.position.set(0, 0.02, 0)
  hair.rotation.x = -0.1
  headMesh.add(hair)

  torso.add(head)

  // ── Arms (pivoting from the shoulder)
  const armGeo = new CylinderGeometry(0.06, 0.06, 0.5, 12)
  const handGeo = new SphereGeometry(0.07, 12, 12)

  const leftArm = new Group()
  leftArm.name = 'AvatarLeftArm'
  leftArm.position.set(-0.31, 0.68, 0)
  const leftArmMesh = new Mesh(armGeo, jerseySolid)
  leftArmMesh.position.y = -0.25
  leftArmMesh.castShadow = true
  const leftHand = new Mesh(handGeo, skinMat)
  leftHand.position.y = -0.53
  leftHand.castShadow = true
  leftArm.add(leftArmMesh)
  leftArm.add(leftHand)
  // default slight angle outward
  leftArm.rotation.z = 0.15
  torso.add(leftArm)

  const rightArm = new Group()
  rightArm.name = 'AvatarRightArm'
  rightArm.position.set(0.31, 0.68, 0)
  const rightArmMesh = new Mesh(armGeo, jerseySolid)
  rightArmMesh.position.y = -0.25
  rightArmMesh.castShadow = true
  const rightHand = new Mesh(handGeo, skinMat)
  rightHand.position.y = -0.53
  rightHand.castShadow = true
  rightArm.add(rightArmMesh)
  rightArm.add(rightHand)
  rightArm.rotation.z = -0.15
  torso.add(rightArm)

  // ── Legs (pivoting from the hips, independent of torso rotation)
  const trousersMat = new MeshStandardMaterial({ color: '#33363d', roughness: 0.85 })
  const shoeMat = new MeshStandardMaterial({ color: '#0a0a0a', roughness: 0.5 })
  const legGeo = new BoxGeometry(0.12, 0.7, 0.15)
  const shoeGeo = new BoxGeometry(0.14, 0.08, 0.22)

  const leftLeg = new Group()
  leftLeg.name = 'AvatarLeftLeg'
  leftLeg.position.set(-0.12, 1.0, 0) // hip pivot
  const leftLegMesh = new Mesh(legGeo, trousersMat)
  leftLegMesh.position.y = -0.35
  leftLegMesh.castShadow = true
  const leftShoe = new Mesh(shoeGeo, shoeMat)
  leftShoe.position.set(0, -0.74, 0.04)
  leftShoe.castShadow = true
  leftLeg.add(leftLegMesh)
  leftLeg.add(leftShoe)

  const rightLeg = new Group()
  rightLeg.name = 'AvatarRightLeg'
  rightLeg.position.set(0.12, 1.0, 0)
  const rightLegMesh = new Mesh(legGeo, trousersMat)
  rightLegMesh.position.y = -0.35
  rightLegMesh.castShadow = true
  const rightShoe = new Mesh(shoeGeo, shoeMat)
  rightShoe.position.set(0, -0.74, 0.04)
  rightShoe.castShadow = true
  rightLeg.add(rightLegMesh)
  rightLeg.add(rightShoe)

  root.add(torso)
  root.add(leftLeg)
  root.add(rightLeg)

  // ── Pose state + play() ────────────────────────────────────────────────
  const jointState: JointTargets = { ...POSES.standing }
  // apply initial pose
  const applyJointState = (): void => {
    torso.rotation.x = jointState.torsoRotX
    // head rotation gets overridden by lookAt if enabled; otherwise driven by pose.
    if (!headTrackingActive) {
      head.rotation.x = jointState.headRotX
      head.rotation.y = jointState.headRotY
    }
    leftArm.rotation.x = jointState.leftArmRotX
    leftArm.rotation.z = jointState.leftArmRotZ
    rightArm.rotation.x = jointState.rightArmRotX
    rightArm.rotation.z = jointState.rightArmRotZ
    leftLeg.rotation.x = jointState.leftLegRotX
    rightLeg.rotation.x = jointState.rightLegRotX
  }
  applyJointState()

  let currentPose: AvatarPose = 'standing'
  let activeTween: gsap.core.Tween | null = null

  const play = (pose: AvatarPose): void => {
    if (pose === currentPose && activeTween === null) return
    currentPose = pose
    if (activeTween) {
      activeTween.kill()
      activeTween = null
    }
    const target = POSES[pose]
    activeTween = gsap.to(jointState, {
      ...target,
      duration: 0.5,
      ease: 'power2.inOut',
      onUpdate: applyJointState,
      onComplete: () => {
        activeTween = null
      },
    })
  }

  // ── Head tracking (lookAt) ─────────────────────────────────────────────
  let headTrackingActive = false
  const headTarget = new Vector3()
  const headWorldPos = new Vector3()
  const tmpEuler = new Euler()
  const YAW_CLAMP = MathUtils.degToRad(25)
  const PITCH_CLAMP = MathUtils.degToRad(15)

  const lookAt = (worldX: number, worldY: number, worldZ: number): void => {
    headTrackingActive = true
    headTarget.set(worldX, worldY, worldZ)

    // Compute a look-at in the head's parent space so rotation stays local.
    head.updateWorldMatrix(true, false)
    head.getWorldPosition(headWorldPos)
    // Temporarily use lookAt (world-space), then read Euler and clamp.
    head.lookAt(headTarget)
    tmpEuler.setFromQuaternion(head.quaternion, 'YXZ')
    tmpEuler.y = MathUtils.clamp(tmpEuler.y, -YAW_CLAMP, YAW_CLAMP)
    tmpEuler.x = MathUtils.clamp(tmpEuler.x, -PITCH_CLAMP, PITCH_CLAMP)
    tmpEuler.z = 0
    head.rotation.copy(tmpEuler)
  }

  // ── Jersey (primitive mode no-op) ──────────────────────────────────────
  const applyJersey = (): void => {
    // no-op in primitive mode; for GLB mode this will rebuild the torso
    // material with stripes + label texture
  }

  // ── Idle breathing + tick ──────────────────────────────────────────────
  const baseTorsoY = torso.position.y
  const tick = (_dt: number, elapsed: number): void => {
    const bob = Math.sin(elapsed * 1.5) * 0.01
    torso.position.y = baseTorsoY + bob
    if (!headTrackingActive) {
      // subtle idle head sway
      head.rotation.y = jointState.headRotY + Math.sin(elapsed * 0.7) * 0.05
    }
  }

  // ── Mixer (contract requires one; no clips attached) ───────────────────
  const mixer = new AnimationMixer(root)

  // ── Dispose ────────────────────────────────────────────────────────────
  const dispose = (): void => {
    if (activeTween) {
      activeTween.kill()
      activeTween = null
    }
    gsap.killTweensOf(jointState)
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
    jerseyFront.dispose()
    jerseyBack.dispose()
  }

  const avatar: Avatar & { tick: (dt: number, elapsed: number) => void } = {
    root,
    mixer,
    play,
    lookAt,
    applyJersey,
    dispose,
    tick,
  }

  return Promise.resolve(avatar)
}
