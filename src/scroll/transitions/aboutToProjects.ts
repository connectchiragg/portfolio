/**
 * aboutToProjects — Master-timeline tweens for the second transition
 * (scroll ~0.25 → 0.50):
 *   - Camera slides from the about stop to the projects stop.
 *   - Background lerps deep cyan void → warm cream-2 gallery.
 *   - Hologram reveal ramps 1 → 0.
 *   - Room becomes visible again so it can backdrop the project cards.
 *
 * Owned by W8 (Phase 4 — Master timeline).
 */

import type gsap from 'gsap'
import { Color } from 'three'
import type { PerspectiveCamera, Scene } from 'three'
import type { Room, Hologram, RoomLights } from '../../three/contracts'
import type { CameraStop } from './heroToAbout'

type Timeline = ReturnType<typeof gsap.timeline>

export interface AboutToProjectsDeps {
  camera: PerspectiveCamera
  scene: Scene
  room: Room
  hologram: Hologram
  lights: RoomLights
  lookAt: { x: number; y: number; z: number }
}

export function buildAboutToProjects(
  tl: Timeline,
  from: CameraStop,
  to: CameraStop,
  deps: AboutToProjectsDeps,
  at: number,
  duration: number,
): void {
  const { camera, scene, room, hologram, lights, lookAt } = deps

  tl.fromTo(
    camera.position,
    { x: from.pos.x, y: from.pos.y, z: from.pos.z },
    {
      x: to.pos.x,
      y: to.pos.y,
      z: to.pos.z,
      ease: 'power2.inOut',
      duration,
    },
    at,
  )

  tl.fromTo(
    lookAt,
    { x: from.look.x, y: from.look.y, z: from.look.z },
    {
      x: to.look.x,
      y: to.look.y,
      z: to.look.z,
      ease: 'power2.inOut',
      duration,
    },
    at,
  )

  const bg = scene.background as Color
  const target = new Color('#ffe8cc')
  tl.to(
    bg,
    {
      r: target.r,
      g: target.g,
      b: target.b,
      ease: 'power1.inOut',
      duration,
    },
    at,
  )

  // Hologram reveal 1 → 0 over the front half
  const reveal = { v: 1 }
  tl.to(
    reveal,
    {
      v: 0,
      ease: 'power2.in',
      duration: duration * 0.6,
      onUpdate: () => hologram.setReveal(reveal.v),
    },
    at,
  )

  // Time-of-day: still-night → dim warm gallery
  const tod = { v: 0 }
  tl.to(
    tod,
    {
      v: 0.3,
      ease: 'power1.inOut',
      duration,
      onUpdate: () => lights.setTimeOfDay(tod.v),
    },
    at,
  )

  // Visibility toggles live in timeline.ts per-section ScrollTriggers; see
  // heroToAbout.ts for the rationale.
  void room
  void hologram
}
