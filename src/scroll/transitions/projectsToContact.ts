/**
 * projectsToContact — Master-timeline tweens for the third transition
 * (scroll ~0.50 → 0.75):
 *   - Camera slides from the projects stop to the contact stop (flies to
 *     the parked mailroom at z=16).
 *   - Background lerps cream-2 → tangerine dawn.
 *   - Time-of-day lights lerp dim-warm → golden.
 *   - Mailroom becomes visible.
 *
 * Owned by W8 (Phase 4 — Master timeline).
 */

import type gsap from 'gsap'
import { Color } from 'three'
import type { PerspectiveCamera, Scene, Group } from 'three'
import type { Room, RoomLights, Hologram } from '../../three/contracts'
import type { CameraStop } from './heroToAbout'

type Timeline = ReturnType<typeof gsap.timeline>

export interface ProjectsToContactDeps {
  camera: PerspectiveCamera
  scene: Scene
  room: Room
  mailroom: Group
  lights: RoomLights
  hologram: Hologram
  lookAt: { x: number; y: number; z: number }
}

export function buildProjectsToContact(
  tl: Timeline,
  from: CameraStop,
  to: CameraStop,
  deps: ProjectsToContactDeps,
  at: number,
  duration: number,
): void {
  const { camera, scene, room, mailroom, lights, hologram, lookAt } = deps

  tl.fromTo(
    camera.position,
    { x: from.pos.x, y: from.pos.y, z: from.pos.z, immediateRender: false },
    {
      x: to.pos.x,
      y: to.pos.y,
      z: to.pos.z,
      ease: 'power2.inOut',
      duration,
      immediateRender: false,
    },
    at,
  )

  tl.fromTo(
    lookAt,
    { x: from.look.x, y: from.look.y, z: from.look.z, immediateRender: false },
    {
      x: to.look.x,
      y: to.look.y,
      z: to.look.z,
      ease: 'power2.inOut',
      duration,
      immediateRender: false,
    },
    at,
  )

  const bg = scene.background as Color
  const target = new Color('#ffb673')
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

  // Lights: dim warm → golden dawn
  const tod = { v: 0.3 }
  tl.to(
    tod,
    {
      v: 0.85,
      ease: 'power1.inOut',
      duration,
      onUpdate: () => lights.setTimeOfDay(tod.v),
    },
    at,
  )

  // Phase 7C+: wardrobe reveal flips back from shirt (v=1) → jersey (v=0)
  // as the camera flies into the mailroom. Smooth power3.inOut ease over
  // the full segment matches the heroToAbout reveal feel.
  const reveal = { v: 1 }
  tl.to(
    reveal,
    {
      v: 0,
      ease: 'power3.inOut',
      duration,
      onUpdate: () => hologram.setReveal(reveal.v),
    },
    at,
  )

  // Hide the room at the start of the fly so it doesn't trail behind the
  // camera on its way to the mailroom (the room sits at z≈0 and stays in
  // frame for the first half of the long camera travel to z=19.5).
  tl.call(() => { room.root.visible = false }, undefined, at)

  void mailroom
}
