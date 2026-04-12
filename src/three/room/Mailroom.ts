/**
 * Mailroom.ts — "The Mailroom" scene for the contact section. Stacked
 * cardboard packages, scattered envelopes, a wall, a sunrise window. All
 * built from primitives with PBR materials so the noir lighting rig in
 * lights.ts (sunrise key + hemi bounce on the contact arc) carves them
 * the same way it carves the hero room.
 *
 * Keep the avatar mount spot at world origin within this Group — the
 * timeline state machine parents the standing avatar to the same Group
 * position via teleport.
 */

import {
  Group,
  Mesh,
  Object3D,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Euler,
  Vector3,
  BoxGeometry,
  PlaneGeometry,
  SphereGeometry,
  CylinderGeometry,
  MeshStandardMaterial,
  CanvasTexture,
  SRGBColorSpace,
  LinearFilter,
  RepeatWrapping,
  DoubleSide,
  MathUtils,
} from 'three'
import type { BufferGeometry, Material } from 'three'

// ─── Cardboard texture (procedural) ───────────────────────────────────────
// Adds a subtle fibre noise + a darker corrugated edge so the boxes don't
// read as a flat amber slab under the sunrise key.

function makeCardboardTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  // base
  ctx.fillStyle = '#a07043'
  ctx.fillRect(0, 0, 256, 256)
  // fibre noise
  for (let i = 0; i < 4000; i++) {
    const x = Math.random() * 256
    const y = Math.random() * 256
    const a = Math.random() * 0.18
    ctx.fillStyle = `rgba(60,30,10,${a})`
    ctx.fillRect(x, y, 1, 1)
  }
  // horizontal corrugation streaks
  for (let y = 0; y < 256; y += 6) {
    ctx.fillStyle = `rgba(60,30,10,${0.06 + Math.random() * 0.04})`
    ctx.fillRect(0, y, 256, 1)
  }
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  return tex
}

// Sunrise gradient texture for the window plane (kept from earlier).
function makeSunriseTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, canvas.height, 0, 0)
  grad.addColorStop(0, '#d97a3a')
  grad.addColorStop(0.5, '#f3a35e')
  grad.addColorStop(1, '#ffd1a0')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // sun disc
  ctx.fillStyle = 'rgba(255,240,210,0.95)'
  ctx.beginPath()
  ctx.arc(canvas.width / 2, canvas.height * 0.66, 26, 0, Math.PI * 2)
  ctx.fill()
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.generateMipmaps = false
  return tex
}

// Envelope face texture — symmetric so it reads as an envelope from
// either face (front/back) when applied to a thin double-sided plane.
// Features: pale paper background, the V-shaped flap seam, a small
// orange stamp, and a couple of dark address marks.
function makeEnvelopeTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 160
  const ctx = c.getContext('2d')!

  // Pale paper background
  ctx.fillStyle = '#f4ecdb'
  ctx.fillRect(0, 0, 256, 160)

  // Subtle paper grain
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = `rgba(120,100,70,${Math.random() * 0.07})`
    ctx.fillRect(Math.random() * 256, Math.random() * 160, 1, 1)
  }

  // Envelope flap — two diagonals from top corners meeting at the centre
  ctx.strokeStyle = 'rgba(80,55,30,0.55)'
  ctx.lineWidth = 1.6
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(128, 80)
  ctx.lineTo(256, 0)
  ctx.stroke()
  // Bottom flap mirrored — gives a symmetric look
  ctx.beginPath()
  ctx.moveTo(0, 160)
  ctx.lineTo(128, 80)
  ctx.lineTo(256, 160)
  ctx.stroke()

  // Outer rectangle border (thin)
  ctx.strokeStyle = 'rgba(80,55,30,0.4)'
  ctx.lineWidth = 1
  ctx.strokeRect(2, 2, 252, 156)

  // Small orange stamp in the top-right corner
  ctx.fillStyle = '#d97a3a'
  ctx.fillRect(212, 14, 28, 22)
  ctx.strokeStyle = 'rgba(20,10,5,0.6)'
  ctx.lineWidth = 1
  ctx.strokeRect(212, 14, 28, 22)
  // tiny stamp dotted edge
  ctx.fillStyle = 'rgba(244,236,219,0.9)'
  for (let i = 0; i < 8; i++) {
    ctx.fillRect(212 + i * 4, 12, 2, 2)
    ctx.fillRect(212 + i * 4, 36, 2, 2)
  }
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(210, 14 + i * 4, 2, 2)
    ctx.fillRect(240, 14 + i * 4, 2, 2)
  }

  // Three short dark address lines (lower-left)
  ctx.fillStyle = '#1a1410'
  ctx.fillRect(20, 110, 80, 3)
  ctx.fillRect(20, 122, 100, 3)
  ctx.fillRect(20, 134, 60, 3)

  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  return tex
}

// Soccer ball texture — white with dark pentagon spots laid out in a
// rough truncated-icosahedron pattern via canvas. Wraps onto a sphere.
function makeFootballTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 256
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#f5efe2'
  ctx.fillRect(0, 0, 512, 256)
  ctx.fillStyle = '#1a1410'
  // 12 pentagon spots scattered across the equirectangular map
  const spots: Array<[number, number, number]> = [
    [60, 60, 22],
    [180, 50, 24],
    [310, 70, 22],
    [430, 55, 23],
    [110, 130, 26],
    [240, 130, 28],
    [370, 130, 26],
    [500, 130, 25],
    [60, 200, 22],
    [200, 210, 24],
    [330, 200, 22],
    [460, 210, 23],
  ]
  for (const [cx, cy, r] of spots) {
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * Math.PI * 2) / 5
      const px = cx + Math.cos(a) * r
      const py = cy + Math.sin(a) * r
      if (i === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.closePath()
    ctx.fill()
  }
  // Subtle seam noise
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = `rgba(40,30,20,${Math.random() * 0.18})`
    ctx.fillRect(Math.random() * 512, Math.random() * 256, 1, 1)
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  return tex
}

// Wood floor planks via canvas — warm dark, matches the hero room floor.
function makeFloorTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 512
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#3a2419'
  ctx.fillRect(0, 0, 512, 512)
  for (let row = 0; row < 8; row++) {
    const y = row * 64
    const offset = (row % 2) * 80
    for (let x = -80 + offset; x < 512; x += 160) {
      // plank
      ctx.fillStyle = `rgb(${52 + Math.random() * 14},${32 + Math.random() * 10},${22 + Math.random() * 8})`
      ctx.fillRect(x + 1, y + 1, 158, 62)
      // grain
      for (let g = 0; g < 6; g++) {
        ctx.fillStyle = `rgba(20,10,5,${0.06 + Math.random() * 0.06})`
        ctx.fillRect(x + 4 + Math.random() * 150, y + 4 + Math.random() * 56, 100, 1)
      }
    }
  }
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.wrapS = RepeatWrapping
  tex.wrapT = RepeatWrapping
  tex.repeat.set(2, 2)
  return tex
}

// Helper to add a cardboard box with a strip of dark tape across the top
// and one corner seam — makes each box look like a real package, not a
// matte cube.
function makeBox(
  w: number,
  h: number,
  d: number,
  cardboardTex: CanvasTexture,
): Group {
  const g = new Group()

  const cardMat = new MeshStandardMaterial({
    map: cardboardTex,
    color: '#c69566',
    roughness: 0.92,
    metalness: 0,
  })
  // Each box gets its own texture clone with a slight repeat variation
  // so two adjacent boxes don't look like the same prop.
  const tex = cardboardTex.clone()
  tex.needsUpdate = true
  tex.repeat.set(0.6 + Math.random() * 0.4, 0.6 + Math.random() * 0.4)
  cardMat.map = tex

  const box = new Mesh(new BoxGeometry(w, h, d), cardMat)
  box.castShadow = true
  box.receiveShadow = true
  g.add(box)

  // Tape — dark band across the top
  const tapeMat = new MeshStandardMaterial({
    color: '#5b3416',
    roughness: 0.45,
    metalness: 0.05,
  })
  const tape = new Mesh(new BoxGeometry(w * 1.005, 0.005, d * 0.18), tapeMat)
  tape.position.y = h / 2 + 0.001
  tape.castShadow = false
  g.add(tape)

  // Tiny label patch (white)
  const labelMat = new MeshStandardMaterial({
    color: '#ece4d2',
    roughness: 0.7,
  })
  const label = new Mesh(
    new BoxGeometry(w * 0.32, 0.003, d * 0.22),
    labelMat,
  )
  label.position.set(w * 0.18, h / 2 + 0.003, -d * 0.18)
  g.add(label)

  return g
}

// ─── Mailroom builder ─────────────────────────────────────────────────────

export function buildMailroom(): Group {
  const root = new Group()
  root.name = 'Mailroom'

  const cardboardTex = makeCardboardTexture()

  // ─── Floor — warm wood, same family as hero room ─────────────────────────
  const floorTex = makeFloorTexture()
  const floorMat = new MeshStandardMaterial({
    map: floorTex,
    color: '#553322',
    roughness: 0.85,
    metalness: 0,
  })
  const floor = new Mesh(new PlaneGeometry(12, 8), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  floor.name = 'MailroomFloor'
  root.add(floor)

  // ─── Back wall — warm plaster ────────────────────────────────────────────
  const wallMat = new MeshStandardMaterial({
    color: '#3d2c20',
    roughness: 1.0,
    side: DoubleSide,
  })
  const wall = new Mesh(new PlaneGeometry(12, 5), wallMat)
  wall.position.set(0, 2.5, -3.5)
  wall.receiveShadow = true
  wall.name = 'MailroomBackWall'
  root.add(wall)

  // ─── Side wall (camera-left) — also catches sunrise ──────────────────────
  const sideWall = new Mesh(new PlaneGeometry(8, 5), wallMat.clone())
  sideWall.position.set(-6, 2.5, 0)
  sideWall.rotation.y = Math.PI / 2
  sideWall.receiveShadow = true
  root.add(sideWall)

  // ─── Sunrise window in the side wall ─────────────────────────────────────
  const sunriseTex = makeSunriseTexture()
  const windowMat = new MeshStandardMaterial({
    map: sunriseTex,
    emissive: '#f3a35e',
    emissiveMap: sunriseTex,
    emissiveIntensity: 1.4,
    roughness: 0.4,
  })
  const windowMesh = new Mesh(new PlaneGeometry(2.0, 2.6), windowMat)
  windowMesh.position.set(-5.97, 2.4, -0.5)
  windowMesh.rotation.y = Math.PI / 2
  windowMesh.name = 'MailroomWindow'
  root.add(windowMesh)

  // Window frame — thin dark slats
  const frameMat = new MeshStandardMaterial({ color: '#1a1410', roughness: 0.7 })
  const frameH = new Mesh(new BoxGeometry(0.05, 0.05, 2.7), frameMat)
  frameH.position.set(-5.96, 2.4, -0.5)
  root.add(frameH)
  const frameV = new Mesh(new BoxGeometry(0.05, 2.65, 0.05), frameMat)
  frameV.position.set(-5.96, 2.4, -0.5)
  root.add(frameV)

  // ─── Stacked cardboard packages ──────────────────────────────────────────
  // Layout intent: the contact-pose avatar (parked at world (0.6, 0, 16)
  // with rotation -0.42rad) extends his left arm forward-and-right. The
  // arm-rest world position is roughly (1.6, 1.0, 15.7). In mailroom
  // local space (mailroom group at world (0, 0, 16)) that's (1.6, 1.0,
  // -0.3). The LEAN BOX is positioned so its top surface lands exactly
  // under the bundled arm-rest pose.
  interface BoxSpec {
    w: number
    h: number
    d: number
    pos: [number, number, number]
    rotY: number
  }

  // Medium-sized cube packages stacked into a pyramid that the avatar's
  // wrist physically lands on. The TOP cube of the main lean stack has
  // top y=1.40m which exactly matches the contact-pose wrist world Y.
  //
  // Wrist target (mailroom local): (0.85, 1.40, 0.70).
  const boxSpecs: BoxSpec[] = [
    // ─── MAIN LEAN STACK — bottom cube + small football pedestal.
    //     The ball sits on top of the pedestal directly under the
    //     avatar's hand (added as a separate Mesh further below —
    //     search for "football").
    { w: 0.7, h: 1.05, d: 0.7, pos: [0.85, 0.525, 0.55], rotY: -0.08 },
    // PEDESTAL — small box shifted right to serve as base for ball
    { w: 0.32, h: 0.14, d: 0.3, pos: [1.05, 1.12, 0.38], rotY: 0.08 },

    // ─── Side stack (camera-right of the main stack) — top box removed,
    //     envelope pile fills the gap
    { w: 0.6, h: 0.6, d: 0.6, pos: [1.95, 0.3, 0.0], rotY: 0.14 },
    { w: 0.45, h: 0.4, d: 0.45, pos: [1.95, 0.8, 0.0], rotY: -0.22 },

    // ─── Back stack against the wall
    { w: 0.65, h: 0.65, d: 0.55, pos: [0.4, 0.325, -1.6], rotY: 0.08 },
    { w: 0.5, h: 0.45, d: 0.5, pos: [0.42, 0.875, -1.6], rotY: -0.18 },
    { w: 0.4, h: 0.35, d: 0.4, pos: [0.42, 1.275, -1.6], rotY: 0.25 },

    // ─── Second back stack
    { w: 0.55, h: 0.55, d: 0.55, pos: [1.75, 0.275, -1.7], rotY: -0.05 },
    { w: 0.4, h: 0.4, d: 0.4, pos: [1.78, 0.75, -1.7], rotY: 0.32 },

    // ─── Scattered single boxes
    { w: 0.5, h: 0.5, d: 0.5, pos: [2.85, 0.25, -0.5], rotY: -0.28 },
    { w: 0.4, h: 0.4, d: 0.4, pos: [2.55, 0.2, 1.4], rotY: 0.35 },
    { w: 0.55, h: 0.55, d: 0.55, pos: [-0.7, 0.275, -1.5], rotY: -0.1 },
  ]

  boxSpecs.forEach((spec, i) => {
    const box = makeBox(spec.w, spec.h, spec.d, cardboardTex)
    box.position.set(...spec.pos)
    box.rotation.y = spec.rotY
    box.name = `MailroomBox${i}`
    root.add(box)
  })

  // ─── Envelope sea — hundreds of instances via InstancedMesh ──────────────
  // A single envelope geometry + material rendered ~180 times in one
  // draw call. Scattered randomly across a wide rectangle in front of
  // the box stack with y-jitter so they pile naturally.
  const ENVELOPE_COUNT = 530 // 180 floor + 150 side pile + 200 main box pile
  const floorEnvTex = makeEnvelopeTexture()
  const envelopeMat = new MeshStandardMaterial({
    map: floorEnvTex,
    emissiveMap: floorEnvTex,
    emissive: '#5a4322',
    emissiveIntensity: 0.6,
    roughness: 0.95,
    metalness: 0,
    side: DoubleSide,
  })
  const envelopeGeo = new PlaneGeometry(0.22, 0.14)
  envelopeGeo.rotateX(-Math.PI / 2)
  const envelopes = new InstancedMesh(envelopeGeo, envelopeMat, ENVELOPE_COUNT)
  envelopes.castShadow = false
  envelopes.receiveShadow = true
  envelopes.name = 'MailroomEnvelopes'

  const tmpMat = new Matrix4()
  const tmpQuat = new Quaternion()
  const tmpScl = new Vector3(1, 1, 1)
  const upAxis = new Vector3(0, 1, 0)
  // Hundreds of envelopes scattered across two regions:
  //   1. Foreground heap in front of the avatar (the sea)
  //   2. A thinner trail behind the box stack
  for (let i = 0; i < ENVELOPE_COUNT; i++) {
    let x: number, z: number
    let y: number
    if (i >= 330) {
      // Messy pile on top of the main lean box (x=0.85, z=0.55, top≈1.05)
      const idx = i - 330
      const layer = idx / 200
      const spread = 0.55 * (1 - layer * 0.5)
      x = 0.85 + (Math.random() - 0.5) * spread
      z = 0.55 + (Math.random() - 0.5) * spread
      y = 1.05 + idx * 0.0008
    } else if (i >= 180) {
      // Messy mail pile on side stack — wide at base, narrow at peak
      const idx = i - 180
      const layer = idx / 150 // 0..1 bottom to top
      const spread = 0.35 * (1 - layer * 0.8)
      x = 1.95 + (Math.random() - 0.5) * spread
      z = 0.0 + (Math.random() - 0.5) * spread
      // Each envelope is ~0.014 thick, stack them tightly
      y = 1.0 + idx * 0.0015
    } else if (i < ENVELOPE_COUNT * 0.78) {
      // Foreground sea — wide spread in front of the box pile
      x = MathUtils.lerp(-2.4, 3.0, Math.random())
      z = MathUtils.lerp(0.6, 2.6, Math.random())
      y = 0.008 + Math.random() * 0.07
    } else {
      // Trail behind / around the boxes
      x = MathUtils.lerp(-1.5, 2.6, Math.random())
      z = MathUtils.lerp(-2.4, -0.4, Math.random())
      y = 0.008 + Math.random() * 0.07
    }
    const scl = i >= 180 ? 0.45 + Math.random() * 0.25 : 0.8 + Math.random() * 0.55
    if (i >= 180) { // both piles get messy tilts
      // Messy tilted orientations — envelopes lean and stick out
      const tiltX = (Math.random() - 0.5) * 0.6 // lean forward/back
      const rotY = Math.random() * Math.PI * 2   // random yaw
      const tiltZ = (Math.random() - 0.5) * 0.5  // lean left/right
      const euler = new Euler(tiltX, rotY, tiltZ)
      tmpQuat.setFromEuler(euler)
    } else {
      const rot = Math.random() * Math.PI * 2
      tmpQuat.setFromAxisAngle(upAxis, rot)
    }
    tmpScl.set(scl, 1, scl)
    tmpMat.compose(new Vector3(x, y, z), tmpQuat, tmpScl)
    envelopes.setMatrixAt(i, tmpMat)
  }
  envelopes.instanceMatrix.needsUpdate = true
  root.add(envelopes)

  // A second InstancedMesh for stamp accents — a smaller orange chip at
  // the same world transform offset by the corner of the envelope, so a
  // fraction of the envelope sea visibly carries postage marks.
  const STAMP_COUNT = Math.floor(ENVELOPE_COUNT * 0.55)
  const stampMat = new MeshStandardMaterial({
    color: '#d97a3a',
    roughness: 0.6,
  })
  const stampGeo = new BoxGeometry(0.06, 0.018, 0.07)
  const stamps = new InstancedMesh(stampGeo, stampMat, STAMP_COUNT)
  stamps.name = 'MailroomStamps'
  for (let i = 0; i < STAMP_COUNT; i++) {
    let x: number, z: number
    if (i < STAMP_COUNT * 0.78) {
      x = MathUtils.lerp(-2.4, 3.0, Math.random())
      z = MathUtils.lerp(0.6, 2.6, Math.random())
    } else {
      x = MathUtils.lerp(-1.5, 2.6, Math.random())
      z = MathUtils.lerp(-2.4, -0.4, Math.random())
    }
    const y = 0.018 + Math.random() * 0.07
    const rot = Math.random() * Math.PI * 2
    tmpQuat.setFromAxisAngle(upAxis, rot)
    // Offset toward one corner of the envelope (rotated with it)
    const cornerX = 0.11 * Math.cos(rot) - 0.06 * Math.sin(rot)
    const cornerZ = 0.11 * Math.sin(rot) + 0.06 * Math.cos(rot)
    tmpMat.compose(
      new Vector3(x + cornerX, y, z + cornerZ),
      tmpQuat,
      new Vector3(1, 1, 1),
    )
    stamps.setMatrixAt(i, tmpMat)
  }
  stamps.instanceMatrix.needsUpdate = true
  root.add(stamps)

  // ─── Raining envelopes ───────────────────────────────────────────────────
  // 90 envelopes falling at various distances from the camera. Each has
  // its own random fall speed, drift and rotation. The mailroom group's
  // userData.tick is called by ThreeCanvas every frame to advance them.
  const RAIN_COUNT = 90
  const envelopeFaceTex = makeEnvelopeTexture()
  const rainMat = new MeshStandardMaterial({
    map: envelopeFaceTex,
    emissiveMap: envelopeFaceTex,
    emissive: '#5a4322',
    emissiveIntensity: 0.6,
    roughness: 0.95,
    metalness: 0,
    side: DoubleSide,
  })
  // True flat plane — no thickness at all. DoubleSide makes both faces
  // render with the envelope texture so the rain reads as envelopes
  // whichever way they tumble.
  const rainGeo = new PlaneGeometry(0.22, 0.14)
  // PlaneGeometry sits in the XY plane facing +Z by default. Rotate to
  // lie flat on the XZ plane so the falling envelopes settle face-up.
  rainGeo.rotateX(-Math.PI / 2)
  const rainEnvelopes = new InstancedMesh(rainGeo, rainMat, RAIN_COUNT)
  rainEnvelopes.castShadow = false
  rainEnvelopes.receiveShadow = false
  rainEnvelopes.frustumCulled = false
  rainEnvelopes.name = 'MailroomRain'
  root.add(rainEnvelopes)

  // Per-instance state arrays — paper-like fall: slow speed, tumbling
  // around all 3 axes, plus a sinusoidal horizontal flutter so the
  // envelopes drift side-to-side as they fall.
  const rainPos = new Float32Array(RAIN_COUNT * 3)
  const rainSpeed = new Float32Array(RAIN_COUNT) // gravitational fall (m/s)
  const rainEulerX = new Float32Array(RAIN_COUNT)
  const rainEulerY = new Float32Array(RAIN_COUNT)
  const rainEulerZ = new Float32Array(RAIN_COUNT)
  const rainSpinX = new Float32Array(RAIN_COUNT)
  const rainSpinY = new Float32Array(RAIN_COUNT)
  const rainSpinZ = new Float32Array(RAIN_COUNT)
  const rainFlutterPhase = new Float32Array(RAIN_COUNT)
  const rainFlutterFreq = new Float32Array(RAIN_COUNT)
  const rainFlutterAmpX = new Float32Array(RAIN_COUNT)
  const rainFlutterAmpZ = new Float32Array(RAIN_COUNT)
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainPos[i * 3 + 0] = MathUtils.lerp(-4, 4, Math.random())
    rainPos[i * 3 + 1] = MathUtils.lerp(0.5, 5.0, Math.random())
    rainPos[i * 3 + 2] = MathUtils.lerp(-3, 3, Math.random())
    // Slow paper fall — terminal velocity ~0.18..0.32 m/s
    rainSpeed[i] = 0.18 + Math.random() * 0.14
    // Random initial Euler — paper starts at any orientation
    rainEulerX[i] = Math.random() * Math.PI * 2
    rainEulerY[i] = Math.random() * Math.PI * 2
    rainEulerZ[i] = Math.random() * Math.PI * 2
    // Spin rates per axis — paper tumbles slowly on X/Z, faster on Y
    rainSpinX[i] = (Math.random() - 0.5) * 1.6
    rainSpinY[i] = (Math.random() - 0.5) * 2.0
    rainSpinZ[i] = (Math.random() - 0.5) * 1.6
    // Horizontal flutter sine — phase, freq, amplitude
    rainFlutterPhase[i] = Math.random() * Math.PI * 2
    rainFlutterFreq[i] = 0.6 + Math.random() * 0.9 // 0.6..1.5 Hz
    rainFlutterAmpX[i] = 0.18 + Math.random() * 0.22 // 0.18..0.40 m/s
    rainFlutterAmpZ[i] = 0.12 + Math.random() * 0.18
  }

  const rainEuler = new Euler(0, 0, 0, 'XYZ')
  let rainElapsed = 0
  const rainTick = (dt: number): void => {
    rainElapsed += dt
    for (let i = 0; i < RAIN_COUNT; i++) {
      // Fall under gravity (constant terminal velocity)
      rainPos[i * 3 + 1] -= rainSpeed[i] * dt

      // Sinusoidal horizontal drift — gives the paper-flutter sway
      const phase = rainElapsed * rainFlutterFreq[i] + rainFlutterPhase[i]
      rainPos[i * 3 + 0] += Math.cos(phase) * rainFlutterAmpX[i] * dt
      rainPos[i * 3 + 2] += Math.sin(phase * 0.83) * rainFlutterAmpZ[i] * dt

      // Wrap when below the floor — re-spawn high up at a fresh xz
      if (rainPos[i * 3 + 1] < 0.05) {
        rainPos[i * 3 + 0] = MathUtils.lerp(-4, 4, Math.random())
        rainPos[i * 3 + 1] = MathUtils.lerp(3.5, 5.5, Math.random())
        rainPos[i * 3 + 2] = MathUtils.lerp(-3, 3, Math.random())
      }

      // Tumble on all three axes
      rainEulerX[i] += rainSpinX[i] * dt
      rainEulerY[i] += rainSpinY[i] * dt
      rainEulerZ[i] += rainSpinZ[i] * dt

      rainEuler.set(rainEulerX[i], rainEulerY[i], rainEulerZ[i])
      tmpQuat.setFromEuler(rainEuler)
      tmpMat.compose(
        new Vector3(rainPos[i * 3], rainPos[i * 3 + 1], rainPos[i * 3 + 2]),
        tmpQuat,
        new Vector3(1, 1, 1),
      )
      rainEnvelopes.setMatrixAt(i, tmpMat)
    }
    rainEnvelopes.instanceMatrix.needsUpdate = true
  }

  // Expose the tick driver via the group's userData so ThreeCanvas can
  // call it from its scene tick callback each frame.
  root.userData.tick = (dt: number): void => {
    if (!root.visible) return // skip rain when contact section is off
    rainTick(dt)
  }

  // Football removed from pedestal — now held in avatar's hand (Avatar.ts)

  // Lamp removed per user request

  // Avatar mount spot is intentionally left empty at (0, 0, 0) — orchestrator
  // teleports the standing avatar to the mailroom group position.

  return root
}

// ─── Disposal helper ──────────────────────────────────────────────────────

export function disposeMailroom(group: Group): void {
  group.traverse((obj: Object3D) => {
    const mesh = obj as Mesh
    const geometry = mesh.geometry as BufferGeometry | undefined
    if (geometry && typeof geometry.dispose === 'function') {
      geometry.dispose()
    }
    const material = mesh.material as Material | Material[] | undefined
    if (material) {
      if (Array.isArray(material)) {
        for (const m of material) {
          const anyMat = m as MeshStandardMaterial
          if (anyMat.map) anyMat.map.dispose()
          if (anyMat.emissiveMap) anyMat.emissiveMap.dispose()
          m.dispose()
        }
      } else {
        const anyMat = material as MeshStandardMaterial
        if (anyMat.map) anyMat.map.dispose()
        if (anyMat.emissiveMap) anyMat.emissiveMap.dispose()
        material.dispose()
      }
    }
  })
}
