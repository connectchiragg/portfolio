/**
 * Room.ts — Hero scene geometry for "Late Night, Bengaluru".
 *
 * Phase 7D: loads real GLB assets for every prop, with inline primitive
 * fallbacks if a GLB 404s.
 */

import {
  Group,
  Mesh,
  BoxGeometry,
  PlaneGeometry,
  MeshStandardMaterial,
  MeshBasicMaterial,
  CanvasTexture,
  SRGBColorSpace,
  LinearFilter,
  Vector2,
  AdditiveBlending,
  Object3D,
  Box3,
  Vector3,
  BufferGeometry,
  LatheGeometry,
  TorusGeometry,
  SphereGeometry,
} from 'three'
import type { Material } from 'three'
import type { Loader, Room, RoomProps } from '../contracts'
import { createDeskMonitorTexture } from './DeskMonitor'

// ─── Palette ────────────────────────────────────────────────────────────
const PALETTE = {
  cream: '#fff5e9',
  ink: '#14110f',
  deep2: '#0d1240',
  cyan: '#4ad8ff',
  tangerine: '#ffa35e',
  wood: '#7a4a26',
  woodDark: '#3a2419',
  wallSide: '#141a4a',
  black: '#0a0a0a',
  skyBlue: '#7bc5ff',
  green: '#3aa860',
  leafGreen: '#4cc06a',
  maroon: '#7a2230',
  mustard: '#c9a227',
  navy: '#1a2460',
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

function enableShadows(obj: Object3D): void {
  obj.traverse((child) => {
    if ((child as Mesh).isMesh) {
      child.castShadow = true
      child.receiveShadow = true
    }
  })
}

function scaleToHeight(obj: Object3D, targetHeight: number): void {
  const box = new Box3().setFromObject(obj)
  const size = new Vector3()
  box.getSize(size)
  if (size.y > 0) {
    const s = targetHeight / size.y
    obj.scale.multiplyScalar(s)
  }
}

/**
 * Scale to target height and return the y-offset needed to ground the
 * object (so its bounding box bottom sits at y=0). The caller adds this
 * offset to whatever surface y they want.
 */
function scaleAndGround(obj: Object3D, targetHeight: number): number {
  scaleToHeight(obj, targetHeight)
  const box = new Box3().setFromObject(obj)
  return -box.min.y
}

async function tryLoad(loader: Loader, url: string): Promise<Group | null> {
  try {
    const result = await loader.load(url)
    return result.scene
  } catch {
    console.warn(`[Room] GLB not found: ${url}, using primitive fallback`)
    return null
  }
}

// ─── Room shell (always primitive) ──────────────────────────────────────
function buildRoomShell(): Group {
  const group = new Group()

  const floor = new Mesh(new PlaneGeometry(10, 10), std(PALETTE.woodDark, 0.9))
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  group.add(floor)

  const backWall = new Mesh(new PlaneGeometry(10, 5), std(PALETTE.deep2, 0.95))
  backWall.position.set(0, 2.5, -3)
  backWall.receiveShadow = true
  group.add(backWall)

  const sideWall = new Mesh(new PlaneGeometry(10, 5), std(PALETTE.wallSide, 0.95))
  sideWall.rotation.y = Math.PI / 2
  sideWall.position.set(-3, 2.5, 0)
  sideWall.receiveShadow = true
  group.add(sideWall)

  const glow = new Mesh(
    new PlaneGeometry(1.6, 1.1),
    new MeshBasicMaterial({ color: PALETTE.skyBlue, transparent: true, opacity: 0.85 }),
  )
  glow.position.set(-1.6, 3.0, -2.98)
  group.add(glow)

  const frameMat = std(PALETTE.ink, 0.6)
  const addFrameBar = (w: number, h: number, x: number, y: number): void => {
    const bar = new Mesh(new BoxGeometry(w, h, 0.04), frameMat)
    bar.position.set(x, y, -2.96)
    group.add(bar)
  }
  addFrameBar(1.72, 0.06, -1.6, 3.58)
  addFrameBar(1.72, 0.06, -1.6, 2.42)
  addFrameBar(0.06, 1.22, -2.42, 3.0)
  addFrameBar(0.06, 1.22, -0.78, 3.0)
  addFrameBar(1.72, 0.04, -1.6, 3.0)
  addFrameBar(0.04, 1.22, -1.6, 3.0)

  return group
}

// ─── Primitive fallbacks ────────────────────────────────────────────────
function buildDeskPrimitive(): Group {
  const group = new Group()
  const woodMat = std(PALETTE.wood, 0.6)
  const top = shadowed(new Mesh(new BoxGeometry(2.2, 0.06, 1.0), woodMat))
  top.position.y = 1.0
  group.add(top)
  const legGeom = new BoxGeometry(0.08, 1.0, 0.08)
  for (const [x, z] of [[-1.05, 0.45], [1.05, 0.45], [-1.05, -0.45], [1.05, -0.45]] as [number, number][]) {
    const leg = shadowed(new Mesh(legGeom, woodMat))
    leg.position.set(x, 0.5, z)
    group.add(leg)
  }
  return group
}

function buildMugPrimitive(): Group {
  const group = new Group()
  const points: Vector2[] = [
    new Vector2(0, 0), new Vector2(0.05, 0), new Vector2(0.06, 0.01),
    new Vector2(0.06, 0.14), new Vector2(0.065, 0.15),
    new Vector2(0.05, 0.15), new Vector2(0.05, 0.02),
  ]
  const bodyMat = std(PALETTE.green, 0.5)
  const body = shadowed(new Mesh(new LatheGeometry(points, 24), bodyMat))
  group.add(body)
  const handle = shadowed(new Mesh(new TorusGeometry(0.04, 0.012, 8, 16, Math.PI), bodyMat))
  handle.position.set(0.06, 0.08, 0)
  handle.rotation.y = Math.PI / 2
  handle.rotation.z = -Math.PI / 2
  group.add(handle)
  return group
}

function buildFootballPrimitive(): Group {
  const group = new Group()
  const ball = shadowed(new Mesh(new SphereGeometry(0.13, 24, 18), std(PALETTE.cream, 0.6)))
  ball.position.y = 0.13
  group.add(ball)
  return group
}

// ─── Whiteboard (always procedural — CanvasTexture) ─────────────────────
function makeWhiteboardTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 720
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#f4f3ee'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = 'rgba(180, 180, 180, 0.05)'
  for (let i = 0; i < 30; i++) {
    ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 60, 1)
  }

  ctx.fillStyle = '#1c2552'
  ctx.font = 'bold 56px sans-serif'
  ctx.fillText('SYSTEM DESIGN', 60, 90)

  ctx.strokeStyle = '#1c2552'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(60, 110)
  ctx.lineTo(540, 110)
  ctx.stroke()

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

  ctx.strokeStyle = '#444'
  ctx.lineWidth = 3
  const drawArrow = (x1: number, y: number, x2: number) => {
    ctx.beginPath()
    ctx.moveTo(x1, y)
    ctx.lineTo(x2, y)
    ctx.stroke()
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

  ctx.fillStyle = '#333'
  ctx.font = '24px sans-serif'
  ctx.fillText('• caching layer (redis)', 80, 370)
  ctx.fillText('• rate limit @ edge', 80, 410)
  ctx.fillText('• circuit breaker → fallback', 80, 450)
  ctx.fillText('• observability: traces + metrics', 80, 490)

  ctx.fillStyle = '#dc2626'
  ctx.font = 'bold 32px sans-serif'
  ctx.fillText('TODO', 600, 370)
  ctx.fillStyle = '#333'
  ctx.font = '24px sans-serif'
  ctx.fillText('☐ schema migration', 600, 410)
  ctx.fillText('☐ load test', 600, 450)
  ctx.fillText('☐ deploy preview', 600, 490)
  ctx.fillText('☑ doc update', 600, 530)

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

  const frame = shadowed(new Mesh(new BoxGeometry(2.4, 1.7, 0.05), std('#1a1a1a', 0.6)))
  group.add(frame)

  const boardMat = new MeshStandardMaterial({
    map: tex, roughness: 0.85, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.08,
  })
  const board = new Mesh(new PlaneGeometry(2.3, 1.6), boardMat)
  board.position.z = 0.026
  board.receiveShadow = true
  group.add(board)

  const tray = shadowed(new Mesh(new BoxGeometry(2.2, 0.05, 0.12), std('#888888', 0.4, 0.6)))
  tray.position.set(0, -0.92, 0.06)
  group.add(tray)

  return group
}

// ─── Main loader ────────────────────────────────────────────────────────
export async function loadRoom(loader: Loader): Promise<Room> {
  const root = new Group()
  root.name = 'HeroRoom'

  root.add(buildRoomShell())

  // ─── Load all GLBs in parallel ────────────────────────────────────────
  const [
    deskGlb,
    mugGlb,
    footballGlb,
  ] = await Promise.all([
    tryLoad(loader, '/models/desk.glb'),
    tryLoad(loader, '/models/mug.glb'),
    tryLoad(loader, '/models/football.glb'),
  ])

  // ─── Desk ─────────────────────────────────────────────────────────────
  // The desk surface height after scaling — props on the desk use this y.
  const DESK_SURFACE_Y = 0.76

  let desk: Group
  if (deskGlb) {
    desk = deskGlb
    enableShadows(desk)
    scaleToHeight(desk, 1.05)
    desk.rotation.y = Math.PI / 2 // rotate so long edge faces back wall
    desk.position.set(0, 0, 0.2)
    // Hide the telephone (meshes Object_5 through Object_14)
    // Objects 2-4 are monitor/stand — keep those visible
    desk.traverse((c) => {
      const m = c.name.match(/^Object_(\d+)$/)
      if (m) {
        const id = Number(m[1])
        if (id >= 5 && id <= 14) c.visible = false
      }
    })
  } else {
    desk = buildDeskPrimitive()
    desk.position.set(0, 0, 0.2)
  }
  root.add(desk)

  // Desk monitor texture (used by the whiteboard now that laptop is removed)
  const deskMonitor = createDeskMonitorTexture()

  // ─── Mug ──────────────────────────────────────────────────────────────
  let mug: Group
  if (mugGlb) {
    mug = mugGlb
    enableShadows(mug)
    const groundY = scaleAndGround(mug, 0.10)
    mug.scale.multiplyScalar(1.2)
    mug.scale.y *= 0.85 // 15% shorter
    mug.position.set(0.7, DESK_SURFACE_Y + groundY, 0.2)
  } else {
    mug = buildMugPrimitive()
    mug.position.set(0.7, DESK_SURFACE_Y, 0.2)
  }
  root.add(mug)

  // Realistic coffee steam — soft radial-gradient sprites that rise, drift,
  // expand and fade. A procedural canvas creates a smooth circular puff.
  const smokeTex = (() => {
    const w = 48
    const h = 120
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')!
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h / 2)
    grad.addColorStop(0, 'rgba(255,255,255,0.5)')
    grad.addColorStop(0.15, 'rgba(255,255,255,0.3)')
    grad.addColorStop(0.4, 'rgba(255,255,255,0.08)')
    grad.addColorStop(0.7, 'rgba(255,255,255,0.01)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
    const tex = new CanvasTexture(c)
    tex.generateMipmaps = false
    tex.magFilter = LinearFilter
    tex.minFilter = LinearFilter
    return tex
  })()

  const steamGroup = new Group()
  const STEAM_COUNT = 18

  interface SteamPuff {
    mesh: Mesh
    speed: number
    phase: number
    driftX: number
    driftZ: number
    life: number
    maxOpacity: number
  }
  const steamPuffs: SteamPuff[] = []
  const puffGeo = new PlaneGeometry(1, 2.5)

  for (let i = 0; i < STEAM_COUNT; i++) {
    const mat = new MeshBasicMaterial({
      map: smokeTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: AdditiveBlending,
    })
    const puff = new Mesh(puffGeo, mat)
    puff.renderOrder = 999
    steamGroup.add(puff)
    steamPuffs.push({
      mesh: puff,
      speed: 0.15 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
      driftX: (Math.random() - 0.5) * 0.06,
      driftZ: (Math.random() - 0.5) * 0.06,
      life: Math.random(),
      maxOpacity: 0.015 + Math.random() * 0.015,
    })
  }
  steamGroup.position.copy(mug.position)
  steamGroup.position.y += 0.07
  root.add(steamGroup)

  let steamElapsed = 0
  const steamTick = (dt: number): void => {
    steamElapsed += dt
    for (const p of steamPuffs) {
      p.life += dt * p.speed
      if (p.life > 1) {
        p.life -= 1
        p.driftX = (Math.random() - 0.5) * 0.06
        p.driftZ = (Math.random() - 0.5) * 0.06
        p.maxOpacity = 0.06 + Math.random() * 0.06
      }
      const t = p.life
      // Rise slowly
      p.mesh.position.y = t * 0.18
      // Gentle drift + sine wobble
      p.mesh.position.x = p.driftX * t + Math.sin(steamElapsed + p.phase) * 0.008
      p.mesh.position.z = p.driftZ * t + Math.cos(steamElapsed * 0.8 + p.phase) * 0.006
      // Slowly rotate for organic look
      p.mesh.rotation.z = steamElapsed * 0.3 + p.phase
      // Grow as it rises
      const size = 0.015 + t * 0.025
      p.mesh.scale.set(size, size, size)
      // Fade: ramp up 0→0.2, hold 0.2→0.5, fade 0.5→1
      const mat = p.mesh.material as MeshBasicMaterial
      if (t < 0.2) {
        mat.opacity = (t / 0.2) * p.maxOpacity
      } else if (t < 0.5) {
        mat.opacity = p.maxOpacity
      } else {
        mat.opacity = p.maxOpacity * (1 - (t - 0.5) / 0.5)
      }
    }
  }

  // Lamp GLB removed — light comes from the SpotLight in lights.ts

  // ─── Football ─────────────────────────────────────────────────────────
  let football: Group
  if (footballGlb) {
    football = footballGlb
    enableShadows(football)
    const ballGroundY = scaleAndGround(football, 0.26)
    football.position.set(0.9, ballGroundY, 0.6)
  } else {
    football = buildFootballPrimitive()
    football.position.set(0.9, 0, 0.6)
  }
  root.add(football)

  // Manga stack removed per user request

  // Plant/succulent removed per user request

  // ─── Whiteboard ───────────────────────────────────────────────────────
  const whiteboard = buildWhiteboard()
  whiteboard.position.set(0, 1.7, -1.4)
  root.add(whiteboard)

  const props: RoomProps = {
    desk,
    mug,
    football,
  }

  const getHitMesh = (name: keyof RoomProps): Object3D | null => {
    return props[name] ?? null
  }

  const tick = (dt: number): void => {
    deskMonitor.update(dt)
    steamTick(dt)
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
    tick,
  } as Room & { tick: (dt: number) => void }
}
