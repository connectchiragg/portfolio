/**
 * projectsToContact — Master-timeline tweens for the third transition:
 *   - Camera stays put (mailroom lifts into view via elevator tick).
 *   - Background lerps to tangerine dawn.
 *   - Time-of-day lights lerp dim-warm → golden.
 *   - Wardrobe reveal flips back to jersey.
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
  _from: CameraStop,
  _to: CameraStop,
  deps: ProjectsToContactDeps,
  at: number,
  duration: number,
): void {
  const { scene, room, lights, hologram } = deps

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

  // Wardrobe reveal flips back from shirt (v=1) → jersey (v=0)
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

  // Hide the room at the start
  tl.call(() => { room.root.visible = false }, undefined, at)
}
