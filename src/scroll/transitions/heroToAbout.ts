/**
 * heroToAbout — Transition tweens added to the master scrubbed timeline.
 *
 * Covers the first quarter of the scroll (0 → 0.25 on a 0..1 master tl):
 *   - Camera slides from the hero stop to the about stop.
 *   - Scene background lerps from warm dark room cream → deep cyan void.
 *   - Hologram reveal ramps 0 → 1.
 *   - Room fades out (visibility drops at the midpoint) so the camera can
 *     "turn away" into the void.
 *
 * Owned by W8 (Phase 4 — Master timeline).
 */

import type gsap from 'gsap'
import { Color } from 'three'
import type { PerspectiveCamera, Scene } from 'three'
import type { Room, Hologram } from '../../three/contracts'

type Timeline = ReturnType<typeof gsap.timeline>

export interface HeroToAboutDeps {
  camera: PerspectiveCamera
  scene: Scene
  room: Room
  hologram: Hologram
  lookAt: { x: number; y: number; z: number }
}

export interface CameraStop {
  pos: { x: number; y: number; z: number }
  look: { x: number; y: number; z: number }
}

export function buildHeroToAbout(
  tl: Timeline,
  from: CameraStop,
  to: CameraStop,
  deps: HeroToAboutDeps,
  at: number,
  duration: number,
): void {
  const { camera, scene, room, hologram, lookAt } = deps
  const end = at + duration

  // Camera position. immediateRender: false so the from-state is NOT
  // written to camera.position when the tween is added — otherwise the
  // last fromTo added to the master timeline would clobber the camera
  // before the user has scrolled anywhere.
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

  // Camera lookAt target (tracked via a plain object, re-applied per tick)
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

  // Background colour: warm dark room → deep cyan void
  const bg = scene.background as Color
  const target = new Color('#060a26')
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

  // Phase 7+: scan reveal is now driven by a dedicated ScrollTrigger
  // tied to the visible #about range (see timeline.ts), not the master
  // timeline. The hero section must stay pure jersey with no scan band.

  // Visibility toggles are handled in the per-section ScrollTriggers in
  // timeline.ts (onEnter / onLeaveBack), not here. Scrubbed `tl.call` fires
  // symmetrically on both forward + reverse passes, which makes it
  // impossible to maintain a coherent visibility state across scrolling
  // directions. Suppress the unused-var warning instead.
  void room
  void hologram
  void end
}
