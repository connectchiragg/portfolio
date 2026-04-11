/**
 * Mailroom.ts — Phase 3 primitive "contact mailroom" scene for the
 * "Late Night, Bengaluru" portfolio. Builds the golden-dawn Contact section
 * out of Three.js primitives (stacked cardboard boxes, envelopes lying flat,
 * a back wall, a sunrise window) as a self-contained Group. Kept separate
 * from W5's Room.ts so the orchestrator can add/remove it independently
 * during the scroll timeline.
 *
 * When real props arrive later, swap the primitives inside `buildMailroom()`
 * without touching the rest of the scene graph.
 *
 * Owned by W7.
 */

import {
  Group,
  Mesh,
  Object3D,
  BoxGeometry,
  PlaneGeometry,
  SphereGeometry,
  MeshStandardMaterial,
  CanvasTexture,
  SRGBColorSpace,
  LinearFilter,
  DoubleSide,
  MathUtils,
} from 'three'
import type { BufferGeometry, Material } from 'three'

// ─── Sunrise window texture ───────────────────────────────────────────────

function makeSunriseTexture(): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, canvas.height, 0, 0)
  grad.addColorStop(0, '#ff7a1a')
  grad.addColorStop(0.5, '#ffa54a')
  grad.addColorStop(1, '#ffd23f')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  // faint sun disc
  ctx.fillStyle = 'rgba(255, 245, 200, 0.9)'
  ctx.beginPath()
  ctx.arc(canvas.width / 2, canvas.height * 0.62, 22, 0, Math.PI * 2)
  ctx.fill()
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.magFilter = LinearFilter
  tex.minFilter = LinearFilter
  tex.generateMipmaps = false
  return tex
}

// ─── Mailroom builder ─────────────────────────────────────────────────────

export function buildMailroom(): Group {
  const root = new Group()
  root.name = 'Mailroom'

  // PRIMITIVE: floor — golden warm dawn
  const floorMat = new MeshStandardMaterial({
    color: '#e0c08c',
    roughness: 0.95,
  })
  const floor = new Mesh(new PlaneGeometry(8, 6), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(0, 0, 0)
  floor.receiveShadow = true
  floor.name = 'MailroomFloor'
  root.add(floor)

  // PRIMITIVE: back wall
  const wallMat = new MeshStandardMaterial({
    color: '#c9a472',
    roughness: 1.0,
    side: DoubleSide,
  })
  const wall = new Mesh(new PlaneGeometry(8, 4), wallMat)
  wall.position.set(0, 2, -3)
  wall.receiveShadow = true
  wall.name = 'MailroomBackWall'
  root.add(wall)

  // PRIMITIVE: sunrise window
  const sunriseTex = makeSunriseTexture()
  const windowMat = new MeshStandardMaterial({
    map: sunriseTex,
    emissive: '#ffb15a',
    emissiveMap: sunriseTex,
    emissiveIntensity: 0.8,
    roughness: 0.4,
  })
  const windowMesh = new Mesh(new PlaneGeometry(1.6, 2.2), windowMat)
  windowMesh.position.set(-2.2, 2.2, -2.98)
  windowMesh.name = 'MailroomWindow'
  root.add(windowMesh)

  // PRIMITIVE: packages — stacked cardboard boxes
  const boxMat = new MeshStandardMaterial({ color: '#a17042', roughness: 0.85 })
  const labelMat = new MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.7 })

  interface BoxSpec {
    w: number
    h: number
    d: number
    pos: [number, number, number]
    rotY: number
    label?: boolean
  }

  const boxSpecs: BoxSpec[] = [
    { w: 0.9, h: 0.6, d: 0.7, pos: [1.6, 0.3, -1.2], rotY: 0.15, label: true },
    { w: 0.55, h: 0.4, d: 0.5, pos: [2.0, 0.85, -1.1], rotY: -0.25 },
    { w: 0.45, h: 0.45, d: 0.45, pos: [1.2, 0.225, -0.6], rotY: 0.4 },
    { w: 0.7, h: 0.5, d: 0.55, pos: [-1.8, 0.25, -1.4], rotY: -0.1 },
    { w: 0.4, h: 0.35, d: 0.4, pos: [-1.4, 0.175, -0.7], rotY: 0.5 },
    { w: 0.5, h: 0.4, d: 0.45, pos: [-2.1, 0.65, -1.35], rotY: 0.08 },
  ]

  boxSpecs.forEach((spec, i) => {
    const box = new Mesh(new BoxGeometry(spec.w, spec.h, spec.d), boxMat)
    box.position.set(...spec.pos)
    box.rotation.y = spec.rotY
    box.castShadow = true
    box.receiveShadow = true
    box.name = `MailroomBox${i}`
    root.add(box)

    if (spec.label) {
      const label = new Mesh(new BoxGeometry(spec.w * 0.5, 0.02, spec.d * 0.3), labelMat)
      label.position.set(spec.pos[0], spec.pos[1] + spec.h / 2 + 0.011, spec.pos[2])
      label.rotation.y = spec.rotY
      label.castShadow = true
      label.name = `MailroomBoxLabel${i}`
      root.add(label)
    }
  })

  // PRIMITIVE: envelopes lying flat on the floor
  const envelopeMat = new MeshStandardMaterial({ color: '#f7f4ec', roughness: 0.9 })
  const envLabelMat = new MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.8 })

  interface EnvSpec {
    w: number
    d: number
    pos: [number, number, number]
    rotY: number
  }
  const envSpecs: EnvSpec[] = [
    { w: 0.42, d: 0.28, pos: [0.6, 0.011, 0.8], rotY: MathUtils.degToRad(8) },
    { w: 0.42, d: 0.28, pos: [0.75, 0.022, 0.7], rotY: MathUtils.degToRad(-15) },
    { w: 0.38, d: 0.25, pos: [-0.7, 0.011, 1.0], rotY: MathUtils.degToRad(22) },
    { w: 0.4, d: 0.27, pos: [-0.5, 0.022, 0.85], rotY: MathUtils.degToRad(-5) },
  ]

  envSpecs.forEach((spec, i) => {
    const env = new Mesh(new BoxGeometry(spec.w, 0.01, spec.d), envelopeMat)
    env.position.set(...spec.pos)
    env.rotation.y = spec.rotY
    env.castShadow = true
    env.receiveShadow = true
    env.name = `MailroomEnvelope${i}`
    root.add(env)

    // address label
    const label = new Mesh(new BoxGeometry(spec.w * 0.4, 0.011, spec.d * 0.35), envLabelMat)
    label.position.set(spec.pos[0], spec.pos[1] + 0.008, spec.pos[2])
    label.rotation.y = spec.rotY
    label.name = `MailroomEnvelopeLabel${i}`
    root.add(label)
  })

  // PRIMITIVE: mailroom football — resting on the tallest box
  const football = new Mesh(
    new SphereGeometry(0.13, 16, 16),
    new MeshStandardMaterial({ color: '#fafafa', roughness: 0.6 }),
  )
  // Place on top of the second (stacked) box.
  const stackTop = boxSpecs[1]
  football.position.set(
    stackTop.pos[0] - 0.1,
    stackTop.pos[1] + stackTop.h / 2 + 0.13,
    stackTop.pos[2] + 0.05,
  )
  football.castShadow = true
  football.name = 'MailroomFootball'
  root.add(football)

  // Avatar mount spot is intentionally left empty at (0, 0, 0) — orchestrator
  // will parent the standing avatar here during Phase 4 timeline assembly.

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
