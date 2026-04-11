/**
 * Room.ts — Hero scene geometry for "Late Night, Bengaluru". Builds the
 * entire bedroom from Three.js primitive geometries (no GLB loads in Phase 2).
 *
 * Every prop is built by a small named function marked with a
 * `// PRIMITIVE: <slot>` comment — follow `docs/asset-shortlist.md` when
 * you're ready to swap a primitive for a real GLB.
 *
 * Returns a `Room` implementing the contract in `src/three/contracts.d.ts`,
 * plus a non-contract `tick(dt)` method that the orchestrator can hook into
 * the scene loop to drive the procedural laptop-screen animation.
 *
 * Owned by W5.
 */

import {
  Group,
  Mesh,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  PlaneGeometry,
  TorusGeometry,
  LatheGeometry,
  ConeGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  CanvasTexture,
  SRGBColorSpace,
  LinearFilter,
  Vector2,
  DoubleSide,
  Object3D,
  BufferGeometry,
} from 'three'
import type { Material } from 'three'
import type { Loader, Room, RoomProps } from '../contracts'
import { createDeskMonitorTexture } from './DeskMonitor'

// ─── Palette (literal hex from src/styles/global.css) ────────────────────
const PALETTE = {
  cream: '#fff5e9',
  ink: '#14110f',
  deep: '#060a26',
  deep2: '#0d1240',
  cyan: '#4ad8ff',
  magenta: '#ff5ecb',
  lemon: '#fff27a',
  mint: '#7affb8',
  tangerine: '#ffa35e',
  // Room-specific warm neutrals
  wood: '#7a4a26',
  woodDark: '#3a2419',
  wallSide: '#141a4a',
  charcoal: '#1f222a',
  black: '#0a0a0a',
  cork: '#8a5a2b',
  straw: '#e6c988',
  skyBlue: '#7bc5ff',
  green: '#3aa860',
  leafGreen: '#4cc06a',
  maroon: '#7a2230',
  mustard: '#c9a227',
  navy: '#1a2460',
  red: '#d9342b',
  warmShade: '#ffe0a8',
} as const

// ─── Small helpers ──────────────────────────────────────────────────────
function std(color: string, roughness = 0.7, metalness = 0.0): MeshStandardMaterial {
  return new MeshStandardMaterial({ color, roughness, metalness })
}

function shadowed(mesh: Mesh, cast = true, receive = true): Mesh {
  mesh.castShadow = cast
  mesh.receiveShadow = receive
  return mesh
}

// ─── Room shell ─────────────────────────────────────────────────────────
// PRIMITIVE: room-shell — see docs/asset-shortlist.md slot 1 for GLB swap-in
function buildRoomShell(): Group {
  const group = new Group()

  const floor = new Mesh(
    new PlaneGeometry(10, 10),
    std(PALETTE.woodDark, 0.9),
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  group.add(floor)

  const backWall = new Mesh(
    new PlaneGeometry(10, 5),
    std(PALETTE.deep2, 0.95),
  )
  backWall.position.set(0, 2.5, -3)
  backWall.receiveShadow = true
  group.add(backWall)

  const sideWall = new Mesh(
    new PlaneGeometry(10, 5),
    std(PALETTE.wallSide, 0.95),
  )
  sideWall.rotation.y = Math.PI / 2
  sideWall.position.set(-3, 2.5, 0)
  sideWall.receiveShadow = true
  group.add(sideWall)

  // Window cutout on the back wall (moonlight glow pane)
  const glow = new Mesh(
    new PlaneGeometry(1.6, 1.1),
    new MeshBasicMaterial({ color: PALETTE.skyBlue, transparent: true, opacity: 0.85 }),
  )
  glow.position.set(-1.6, 3.0, -2.98)
  group.add(glow)

  // Window frame outline (four thin boxes)
  const frameMat = std(PALETTE.ink, 0.6)
  const frameT = 0.04
  const addFrameBar = (w: number, h: number, x: number, y: number): void => {
    const bar = new Mesh(new BoxGeometry(w, h, frameT), frameMat)
    bar.position.set(x, y, -2.96)
    group.add(bar)
  }
  addFrameBar(1.72, 0.06, -1.6, 3.58) // top
  addFrameBar(1.72, 0.06, -1.6, 2.42) // bottom
  addFrameBar(0.06, 1.22, -2.42, 3.0) // left
  addFrameBar(0.06, 1.22, -0.78, 3.0) // right
  // Cross mullions
  addFrameBar(1.72, 0.04, -1.6, 3.0)
  addFrameBar(0.04, 1.22, -1.6, 3.0)

  return group
}

// ─── Desk ───────────────────────────────────────────────────────────────
// PRIMITIVE: desk — see docs/asset-shortlist.md slot 2 for GLB swap-in
function buildDesk(): Group {
  const group = new Group()
  const woodMat = std(PALETTE.wood, 0.6)

  const top = shadowed(new Mesh(new BoxGeometry(2.2, 0.06, 1.0), woodMat))
  top.position.y = 1.0
  group.add(top)

  const legGeom = new BoxGeometry(0.08, 1.0, 0.08)
  const legY = 0.5
  const legPositions: [number, number][] = [
    [-1.05, 0.45],
    [1.05, 0.45],
    [-1.05, -0.45],
    [1.05, -0.45],
  ]
  for (const [x, z] of legPositions) {
    const leg = shadowed(new Mesh(legGeom, woodMat))
    leg.position.set(x, legY, z)
    group.add(leg)
  }

  return group
}

// ─── Chair ──────────────────────────────────────────────────────────────
// PRIMITIVE: chair — see docs/asset-shortlist.md slot 3 for GLB swap-in
function buildChair(): Group {
  const group = new Group()
  const mat = std(PALETTE.charcoal, 0.7)

  const seat = shadowed(new Mesh(new BoxGeometry(0.55, 0.08, 0.55), mat))
  seat.position.y = 0.55
  group.add(seat)

  const back = shadowed(new Mesh(new BoxGeometry(0.55, 0.7, 0.08), mat))
  back.position.set(0, 0.9, -0.25)
  group.add(back)

  const pedestal = shadowed(
    new Mesh(new CylinderGeometry(0.04, 0.04, 0.45, 12), mat),
  )
  pedestal.position.y = 0.28
  group.add(pedestal)

  // 4 cylinder feet
  const footGeom = new CylinderGeometry(0.05, 0.05, 0.06, 10)
  const footPositions: [number, number][] = [
    [0.22, 0.22],
    [-0.22, 0.22],
    [0.22, -0.22],
    [-0.22, -0.22],
  ]
  for (const [x, z] of footPositions) {
    const foot = shadowed(new Mesh(footGeom, mat))
    foot.position.set(x, 0.03, z)
    group.add(foot)
  }

  // TODO(phase3-merge): avatar mounts here — W7's sitting avatar will be
  // placed as a child of this chair group at (0, 0, 0).

  return group
}

// ─── Laptop ─────────────────────────────────────────────────────────────
// Returns both the laptop group and the screen mesh so the caller can
// assign the live DeskMonitor CanvasTexture onto it.
// PRIMITIVE: laptop — see docs/asset-shortlist.md slot 4 for GLB swap-in
function buildLaptop(): { group: Group; screen: Mesh } {
  const group = new Group()
  const bodyMat = std('#1a1a1a', 0.4, 0.2)

  // Base
  const base = shadowed(new Mesh(new BoxGeometry(0.4, 0.02, 0.28), bodyMat))
  base.position.y = 0.01
  group.add(base)

  // Lid — hinged at the back, tilted ~110°
  const lid = new Group()
  lid.position.set(0, 0.02, -0.14)
  // 110° from flat → tilt backwards past vertical
  lid.rotation.x = -(Math.PI - (110 * Math.PI) / 180)
  group.add(lid)

  const lidShell = shadowed(
    new Mesh(new BoxGeometry(0.4, 0.02, 0.28), bodyMat),
  )
  lidShell.position.set(0, 0, 0.14)
  lid.add(lidShell)

  // Screen — a thin emissive plane parented to the lid's inner face.
  // Initial placeholder material; the caller swaps in the CanvasTexture map.
  const screenMat = new MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#ffffff',
    emissiveIntensity: 0.9,
    roughness: 0.3,
  })
  const screen = new Mesh(new PlaneGeometry(0.36, 0.22), screenMat)
  screen.position.set(0, 0.012, 0.14)
  // Face outward away from the lid's shell so it's visible from the front
  screen.rotation.y = Math.PI
  lid.add(screen)

  return { group, screen }
}

// ─── CRT secondary monitor (no live texture) ───────────────────────────
// PRIMITIVE: secondary-monitor — see docs/asset-shortlist.md slot 5 for GLB swap-in
function buildSecondaryMonitor(): Group {
  const group = new Group()
  const bodyMat = std(PALETTE.ink, 0.6)
  const body = shadowed(new Mesh(new BoxGeometry(0.38, 0.32, 0.32), bodyMat))
  body.position.y = 0.16
  group.add(body)

  const screen = new Mesh(
    new PlaneGeometry(0.28, 0.22),
    new MeshBasicMaterial({ color: PALETTE.deep2 }),
  )
  screen.position.set(0, 0.18, 0.161)
  group.add(screen)

  const stand = shadowed(
    new Mesh(new CylinderGeometry(0.06, 0.08, 0.04, 12), bodyMat),
  )
  stand.position.y = 0.02
  group.add(stand)

  return group
}

// ─── Mug ────────────────────────────────────────────────────────────────
// PRIMITIVE: mug — see docs/asset-shortlist.md slot 6 for GLB swap-in
function buildMug(): Group {
  const group = new Group()

  // Lathe profile for the mug body (outer silhouette from bottom to top)
  const points: Vector2[] = []
  points.push(new Vector2(0, 0))
  points.push(new Vector2(0.05, 0))
  points.push(new Vector2(0.06, 0.01))
  points.push(new Vector2(0.06, 0.14))
  points.push(new Vector2(0.065, 0.15))
  points.push(new Vector2(0.05, 0.15))
  points.push(new Vector2(0.05, 0.02))
  const bodyGeom = new LatheGeometry(points, 24)
  const bodyMat = std(PALETTE.green, 0.5)
  const body = shadowed(new Mesh(bodyGeom, bodyMat))
  group.add(body)

  // Handle — torus segment
  const handle = shadowed(
    new Mesh(new TorusGeometry(0.04, 0.012, 8, 16, Math.PI), bodyMat),
  )
  handle.position.set(0.06, 0.08, 0)
  handle.rotation.y = Math.PI / 2
  handle.rotation.z = -Math.PI / 2
  group.add(handle)

  // Steam puff — semi-transparent cone
  const steam = new Mesh(
    new ConeGeometry(0.04, 0.12, 8, 1, true),
    new MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.15,
      side: DoubleSide,
    }),
  )
  steam.position.y = 0.22
  group.add(steam)

  return group
}

// ─── Headphones ─────────────────────────────────────────────────────────
// PRIMITIVE: headphones — see docs/asset-shortlist.md slot 7 for GLB swap-in
function buildHeadphones(): Group {
  const group = new Group()
  const mat = std(PALETTE.black, 0.5)

  const band = shadowed(
    new Mesh(new TorusGeometry(0.09, 0.012, 8, 20, Math.PI), mat),
  )
  band.rotation.z = Math.PI
  band.position.y = 0.09
  group.add(band)

  const cupGeom = new CylinderGeometry(0.045, 0.045, 0.03, 16)
  const cupL = shadowed(new Mesh(cupGeom, mat))
  cupL.position.set(-0.09, 0.02, 0)
  cupL.rotation.z = Math.PI / 2
  group.add(cupL)

  const cupR = shadowed(new Mesh(cupGeom, mat))
  cupR.position.set(0.09, 0.02, 0)
  cupR.rotation.z = Math.PI / 2
  group.add(cupR)

  return group
}

// ─── Lamp ───────────────────────────────────────────────────────────────
// PRIMITIVE: lamp — see docs/asset-shortlist.md slot 8 for GLB swap-in
function buildLamp(): Group {
  const group = new Group()
  const metalMat = std(PALETTE.ink, 0.4, 0.6)

  const base = shadowed(
    new Mesh(new CylinderGeometry(0.08, 0.1, 0.03, 16), metalMat),
  )
  base.position.y = 0.015
  group.add(base)

  const arm = shadowed(
    new Mesh(new CylinderGeometry(0.012, 0.012, 0.45, 10), metalMat),
  )
  arm.position.y = 0.24
  group.add(arm)

  // Lathe profile for the shade
  const shadePts: Vector2[] = []
  shadePts.push(new Vector2(0.02, 0))
  shadePts.push(new Vector2(0.1, 0))
  shadePts.push(new Vector2(0.14, 0.12))
  shadePts.push(new Vector2(0.13, 0.13))
  const shade = shadowed(
    new Mesh(
      new LatheGeometry(shadePts, 20),
      new MeshStandardMaterial({
        color: PALETTE.warmShade,
        emissive: PALETTE.tangerine,
        emissiveIntensity: 0.35,
        roughness: 0.6,
        side: DoubleSide,
      }),
    ),
  )
  shade.position.y = 0.46
  group.add(shade)

  return group
}

// ─── Football ───────────────────────────────────────────────────────────
// PRIMITIVE: football — see docs/asset-shortlist.md slot 9 for GLB swap-in
function buildFootball(): Group {
  const group = new Group()
  const ball = shadowed(
    new Mesh(
      new SphereGeometry(0.13, 24, 18),
      std(PALETTE.cream, 0.6),
    ),
  )
  ball.position.y = 0.13
  group.add(ball)
  return group
}

// ─── Straw hat ──────────────────────────────────────────────────────────
// PRIMITIVE: straw-hat — see docs/asset-shortlist.md slot 10 for GLB swap-in
function buildStrawHat(): Group {
  const group = new Group()
  const strawMat = std(PALETTE.straw, 0.9)

  const brim = shadowed(
    new Mesh(new CylinderGeometry(0.22, 0.22, 0.01, 24), strawMat),
  )
  brim.position.y = 0.08
  group.add(brim)

  const crown = shadowed(
    new Mesh(new CylinderGeometry(0.11, 0.12, 0.14, 24), strawMat),
  )
  crown.position.y = 0.16
  group.add(crown)

  const ribbon = shadowed(
    new Mesh(
      new TorusGeometry(0.115, 0.012, 8, 24),
      std(PALETTE.red, 0.6),
    ),
  )
  ribbon.rotation.x = Math.PI / 2
  ribbon.position.y = 0.14
  group.add(ribbon)

  // Wall hook
  const hook = shadowed(
    new Mesh(new BoxGeometry(0.04, 0.04, 0.08), std(PALETTE.ink, 0.5, 0.4)),
  )
  hook.position.set(0, 0.16, -0.08)
  group.add(hook)

  return group
}

// ─── Manga stack ────────────────────────────────────────────────────────
// PRIMITIVE: manga-stack — see docs/asset-shortlist.md slot 11 for GLB swap-in
function buildMangaStack(): Group {
  const group = new Group()
  const slabs = [
    { color: PALETTE.maroon, rot: 0.04 },
    { color: PALETTE.mustard, rot: -0.06 },
    { color: PALETTE.navy, rot: 0.02 },
  ]
  slabs.forEach((s, i) => {
    const slab = shadowed(
      new Mesh(new BoxGeometry(0.18, 0.03, 0.24), std(s.color, 0.75)),
    )
    slab.position.y = 0.015 + i * 0.032
    slab.rotation.y = s.rot
    group.add(slab)
  })
  return group
}

// ─── CRT TV ─────────────────────────────────────────────────────────────
// PRIMITIVE: crt-tv — see docs/asset-shortlist.md slot 12 for GLB swap-in
function buildCrtTv(): Group {
  const group = new Group()
  const bodyMat = std('#2a241c', 0.75)

  const body = shadowed(new Mesh(new BoxGeometry(0.6, 0.5, 0.55), bodyMat))
  body.position.y = 0.25
  group.add(body)

  const screen = new Mesh(
    new PlaneGeometry(0.44, 0.34),
    new MeshStandardMaterial({
      color: PALETTE.deep2,
      emissive: PALETTE.cyan,
      emissiveIntensity: 0.25,
      roughness: 0.3,
    }),
  )
  screen.position.set(0, 0.28, 0.276)
  group.add(screen)

  // Little antenna
  const antennaMat = std(PALETTE.ink, 0.4, 0.6)
  const ant1 = shadowed(
    new Mesh(new CylinderGeometry(0.005, 0.005, 0.3, 6), antennaMat),
  )
  ant1.position.set(-0.1, 0.65, 0)
  ant1.rotation.z = 0.4
  group.add(ant1)
  const ant2 = shadowed(
    new Mesh(new CylinderGeometry(0.005, 0.005, 0.3, 6), antennaMat),
  )
  ant2.position.set(0.1, 0.65, 0)
  ant2.rotation.z = -0.4
  group.add(ant2)

  return group
}

// ─── Succulent on floating shelf ────────────────────────────────────────
// PRIMITIVE: succulent — see docs/asset-shortlist.md slot 13 for GLB swap-in
function buildSucculent(): Group {
  const group = new Group()

  const shelf = shadowed(
    new Mesh(new BoxGeometry(0.5, 0.03, 0.22), std(PALETTE.wood, 0.7)),
  )
  shelf.position.y = 0
  group.add(shelf)

  const pot = shadowed(
    new Mesh(
      new CylinderGeometry(0.07, 0.05, 0.08, 14),
      std('#a35b2c', 0.8),
    ),
  )
  pot.position.y = 0.055
  group.add(pot)

  const leafMat = std(PALETTE.leafGreen, 0.6)
  const leafPositions: [number, number, number, number][] = [
    [0, 0.14, 0, 0.05],
    [0.03, 0.13, 0.02, 0.04],
    [-0.03, 0.13, -0.02, 0.04],
    [0.02, 0.12, -0.03, 0.035],
    [-0.02, 0.15, 0.02, 0.035],
  ]
  for (const [x, y, z, r] of leafPositions) {
    const leaf = shadowed(new Mesh(new SphereGeometry(r, 10, 8), leafMat))
    leaf.position.set(x, y, z)
    leaf.scale.y = 1.4
    group.add(leaf)
  }

  return group
}

// ─── Whiteboard (back wall) ─────────────────────────────────────────────
// Phase 7C+: large whiteboard mounted on the back wall, used as the focal
// point of the hero shot — the avatar stands in front of it with his back
// to the camera. A CanvasTexture overlays a few hand-drawn sketches +
// mock architecture diagrams so it reads as an actual working board, not
// just a blank rectangle.
function makeWhiteboardTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 720
  const ctx = canvas.getContext('2d')!

  // Off-white board surface
  ctx.fillStyle = '#f4f3ee'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Subtle marker streaks
  ctx.fillStyle = 'rgba(180, 180, 180, 0.05)'
  for (let i = 0; i < 30; i++) {
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 60, 1)
  }

  // Heading
  ctx.fillStyle = '#1c2552'
  ctx.font = 'bold 56px sans-serif'
  ctx.fillText('SYSTEM DESIGN', 60, 90)

  // Underline
  ctx.strokeStyle = '#1c2552'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(60, 110)
  ctx.lineTo(540, 110)
  ctx.stroke()

  // Architecture boxes
  const drawBox = (x: number, y: number, w: number, h: number, label: string, color: string) => {
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.strokeRect(x, y, w, h)
    ctx.fillStyle = color
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, x + w / 2, y + h / 2)
    ctx.textAlign = 'start'
    ctx.textBaseline = 'alphabetic'
  }

  drawBox(80, 180, 220, 110, 'CLIENT', '#2563eb')
  drawBox(400, 180, 220, 110, 'API', '#dc2626')
  drawBox(720, 180, 220, 110, 'DB', '#16a34a')

  // Arrows between boxes
  ctx.strokeStyle = '#444'
  ctx.lineWidth = 3
  const drawArrow = (x1: number, y: number, x2: number) => {
    ctx.beginPath()
    ctx.moveTo(x1, y)
    ctx.lineTo(x2, y)
    ctx.stroke()
    // Arrowhead
    ctx.beginPath()
    ctx.moveTo(x2, y)
    ctx.lineTo(x2 - 12, y - 8)
    ctx.lineTo(x2 - 12, y + 8)
    ctx.closePath()
    ctx.fillStyle = '#444'
    ctx.fill()
  }
  drawArrow(300, 235, 400)
  drawArrow(620, 235, 720)

  // Notes underneath
  ctx.fillStyle = '#333'
  ctx.font = '24px sans-serif'
  ctx.fillText('• caching layer (redis)', 80, 370)
  ctx.fillText('• rate limit @ edge', 80, 410)
  ctx.fillText('• circuit breaker → fallback', 80, 450)
  ctx.fillText('• observability: traces + metrics', 80, 490)

  // Right column — todo list
  ctx.fillStyle = '#dc2626'
  ctx.font = 'bold 32px sans-serif'
  ctx.fillText('TODO', 600, 370)
  ctx.fillStyle = '#333'
  ctx.font = '24px sans-serif'
  ctx.fillText('☐ schema migration', 600, 410)
  ctx.fillText('☐ load test', 600, 450)
  ctx.fillText('☐ deploy preview', 600, 490)
  ctx.fillText('☑ doc update', 600, 530)

  // Doodle — small circle/squiggle in the corner
  ctx.strokeStyle = '#2563eb'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.arc(900, 600, 50, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(870, 600)
  ctx.bezierCurveTo(880, 580, 920, 580, 930, 600)
  ctx.stroke()

  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.generateMipmaps = false
  return tex
}

function buildWhiteboard(): Group {
  const group = new Group()
  const tex = makeWhiteboardTexture()

  // Frame: dark border around the board
  const frameGeo = new BoxGeometry(2.4, 1.7, 0.05)
  const frameMat = std('#1a1a1a', 0.6)
  const frame = shadowed(new Mesh(frameGeo, frameMat))
  group.add(frame)

  // Board surface: slightly inset, with the canvas texture
  const boardGeo = new PlaneGeometry(2.3, 1.6)
  const boardMat = new MeshStandardMaterial({
    map: tex,
    roughness: 0.85,
    emissiveMap: tex,
    emissive: '#ffffff',
    emissiveIntensity: 0.08,
  })
  const board = new Mesh(boardGeo, boardMat)
  board.position.z = 0.026
  board.receiveShadow = true
  group.add(board)

  // Tray with markers along the bottom
  const trayGeo = new BoxGeometry(2.2, 0.05, 0.12)
  const tray = shadowed(new Mesh(trayGeo, std('#888888', 0.4, 0.6)))
  tray.position.set(0, -0.92, 0.06)
  group.add(tray)

  return group
}

// ─── Corkboard + jersey pin ─────────────────────────────────────────────
// PRIMITIVE: corkboard — see docs/asset-shortlist.md slot 14 for GLB swap-in
function buildCorkboard(): Group {
  const group = new Group()

  const board = shadowed(
    new Mesh(new BoxGeometry(1.0, 0.7, 0.03), std(PALETTE.cork, 0.95)),
  )
  group.add(board)

  // "Jersey" — a thin box plus faked Argentina vertical stripes
  // (sky-blue + white alternating). Four blue bars side-by-side on a
  // white base, pinned to the cork.
  const base = shadowed(
    new Mesh(new BoxGeometry(0.5, 0.5, 0.02), std(PALETTE.cream, 0.8)),
  )
  base.position.set(-0.1, 0.03, 0.025)
  group.add(base)

  const stripeMat = std(PALETTE.skyBlue, 0.8)
  const stripeWidth = 0.08
  const stripePositions = [-0.18, -0.06, 0.06, 0.18]
  for (const x of stripePositions) {
    const stripe = shadowed(
      new Mesh(new BoxGeometry(stripeWidth, 0.5, 0.005), stripeMat),
    )
    stripe.position.set(-0.1 + x, 0.03, 0.036)
    group.add(stripe)
  }

  // Pin
  const pin = shadowed(
    new Mesh(
      new SphereGeometry(0.012, 8, 6),
      std(PALETTE.red, 0.3, 0.3),
    ),
  )
  pin.position.set(-0.1, 0.25, 0.04)
  group.add(pin)

  return group
}

// ─── Main loader ────────────────────────────────────────────────────────
export async function loadRoom(loader: Loader): Promise<Room> {
  // Loader is reserved for future GLB swap-ins — all Phase 2 props are
  // primitive-only, so we silence the unused-var warning explicitly.
  void loader

  const root = new Group()
  root.name = 'HeroRoom'

  // Shell first
  root.add(buildRoomShell())

  // Desk (+ props on top)
  const desk = buildDesk()
  desk.position.set(0, 0, -0.8)
  root.add(desk)

  // Laptop
  const { group: laptop, screen: laptopScreen } = buildLaptop()
  laptop.position.set(0, 1.03, -0.8)
  root.add(laptop)

  // Wire the procedural "code editor" texture onto the laptop screen.
  const deskMonitor = createDeskMonitorTexture()
  const screenMat = laptopScreen.material as MeshStandardMaterial
  screenMat.map = deskMonitor.texture
  screenMat.emissiveMap = deskMonitor.texture
  screenMat.emissiveIntensity = 1.1
  screenMat.color.set('#ffffff')
  screenMat.needsUpdate = true

  // Secondary CRT-style monitor on the desk corner
  const secondary = buildSecondaryMonitor()
  secondary.position.set(-0.75, 1.03, -0.9)
  root.add(secondary)

  // Chair
  const chair = buildChair()
  chair.position.set(0, 0, 0.2)
  chair.rotation.y = Math.PI
  root.add(chair)

  // Mug
  const mug = buildMug()
  mug.position.set(0.7, 1.03, -0.7)
  root.add(mug)

  // Headphones
  const headphones = buildHeadphones()
  headphones.position.set(-0.55, 1.03, -0.65)
  root.add(headphones)

  // Lamp (back-right corner of desk)
  const lamp = buildLamp()
  lamp.position.set(0.95, 1.03, -1.1)
  root.add(lamp)

  // Football — on the floor beside the chair
  const football = buildFootball()
  football.position.set(0.9, 0, 0.6)
  root.add(football)

  // Straw hat — hung on the side wall
  const strawHat = buildStrawHat()
  strawHat.position.set(-2.95, 2.2, 0.5)
  strawHat.rotation.z = Math.PI / 2
  root.add(strawHat)

  // Manga stack — corner of desk
  const mangaStack = buildMangaStack()
  mangaStack.position.set(-0.35, 1.03, -1.05)
  root.add(mangaStack)

  // CRT TV — floor corner
  const crtTv = buildCrtTv()
  crtTv.position.set(-2.3, 0, -1.2)
  crtTv.rotation.y = Math.PI / 6
  root.add(crtTv)

  // Succulent on floating shelf — attached to side wall
  const succulent = buildSucculent()
  succulent.position.set(-2.88, 2.0, -0.6)
  root.add(succulent)

  // Whiteboard — large, centred on the back wall, the focal point of
  // the hero shot. The avatar stands in front of it with his back to
  // the camera.
  const whiteboard = buildWhiteboard()
  whiteboard.position.set(0, 1.7, -1.4)
  root.add(whiteboard)

  // Corkboard — moved to the upper-right of the back wall so it doesn't
  // overlap the whiteboard.
  const corkboard = buildCorkboard()
  corkboard.position.set(2.0, 2.4, -2.93)
  root.add(corkboard)

  const props: RoomProps = {
    desk,
    laptop,
    chair,
    mug,
    headphones,
    lamp,
    football,
    strawHat,
    mangaStack,
    crtTv,
    succulent,
    corkboard,
  }

  const getHitMesh = (name: keyof RoomProps): Object3D | null => {
    return props[name] ?? null
  }

  const tick = (dt: number): void => {
    deskMonitor.update(dt)
  }

  const dispose = (): void => {
    deskMonitor.dispose()
    root.traverse((obj) => {
      const mesh = obj as Mesh
      const geom = mesh.geometry as BufferGeometry | undefined
      if (geom && typeof geom.dispose === 'function') {
        geom.dispose()
      }
      const mat = mesh.material as Material | Material[] | undefined
      if (mat) {
        if (Array.isArray(mat)) {
          for (const m of mat) m.dispose()
        } else {
          mat.dispose()
        }
      }
    })
  }

  return {
    root,
    props,
    getHitMesh,
    dispose,
    // Non-contract extension: the orchestrator can hook this into the
    // SceneContext tick loop to drive the procedural laptop screen.
    tick,
  } as Room & { tick: (dt: number) => void }
}
