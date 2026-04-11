/**
 * Master scroll timeline — Phase 4.
 *
 * Implements the {@link MasterTimeline} contract from
 * `src/three/contracts.d.ts`. A single `gsap.timeline` bound to a
 * `ScrollTrigger` with `scrub: 1.5` drives the entire cinematic: as the user
 * scrolls from hero → about → projects → contact, the camera glides through
 * four stops, the scene background lerps, time-of-day lights shift, the
 * hologram pulses in/out, and the mailroom is parked/revealed. Discrete
 * one-shot events (avatar pose swaps, teleports) are handled by section-
 * bound ScrollTriggers via `onEnter/onLeave` callbacks.
 *
 * The Lenis ↔ GSAP bridge is established by `createScroll()`
 * (`src/scroll/lenis.ts`). The host component calls `createScroll()` once
 * and then calls `build()` on this timeline.
 *
 * Owned by W8 (Phase 4 — Master timeline).
 */

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Color } from 'three'
import type {
  MasterTimeline,
  SceneContext,
  Room,
  Avatar,
  Hologram,
  RoomLights,
} from '../three/contracts'
import type { Group } from 'three'
import {
  buildHeroToAbout,
  type CameraStop,
} from './transitions/heroToAbout'
import { buildAboutToProjects } from './transitions/aboutToProjects'
import { buildProjectsToContact } from './transitions/projectsToContact'

gsap.registerPlugin(ScrollTrigger)

interface BuildDeps {
  sceneCtx: SceneContext
  room: Room
  avatar: Avatar
  hologram: Hologram
  lights: RoomLights
  mailroom: Group
}

// ─── Camera stops (one per section) ──────────────────────────────────────

const HERO_STOP: CameraStop = {
  pos: { x: 1.5, y: 1.6, z: 3.2 },
  look: { x: 0.5, y: 1.1, z: 0 },
}
const ABOUT_STOP: CameraStop = {
  pos: { x: 0, y: 1.6, z: 3.5 },
  look: { x: 0, y: 1.4, z: 8 },
}
const PROJECTS_STOP: CameraStop = {
  pos: { x: 0, y: 1.6, z: 3.5 },
  look: { x: 0, y: 1.2, z: 0 },
}
const CONTACT_STOP: CameraStop = {
  pos: { x: 0, y: 1.6, z: 19.5 },
  look: { x: 0, y: 1.2, z: 16 },
}

export function createTimeline(): MasterTimeline {
  const triggers: ScrollTrigger[] = []
  let masterTl: gsap.core.Timeline | null = null
  let tickRemover: (() => void) | null = null

  const build = (deps: BuildDeps): void => {
    const { sceneCtx, room, avatar, hologram, lights, mailroom } = deps
    const { scene, camera } = sceneCtx

    // Initial scene background (cream/warm dark room)
    scene.background = new Color('#1a1410')

    // Snap camera to the hero stop up front
    camera.position.set(HERO_STOP.pos.x, HERO_STOP.pos.y, HERO_STOP.pos.z)
    const lookAt = { ...HERO_STOP.look }
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z)

    // Re-apply lookAt every frame since GSAP only tweens numbers on the
    // plain `lookAt` object, not the camera's internal orientation.
    tickRemover = sceneCtx.onTick(() => {
      camera.lookAt(lookAt.x, lookAt.y, lookAt.z)
    })

    // Initial lights & visibility state
    lights.setTimeOfDay(0)
    hologram.setReveal(0)
    hologram.root.visible = false
    mailroom.visible = false
    room.root.visible = true

    // ─── Master scrubbed timeline ────────────────────────────────────────
    // A unit timeline (duration 1) mapped 1:1 to scroll progress.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: 'main',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.5,
      },
    })
    masterTl = tl
    if (tl.scrollTrigger) triggers.push(tl.scrollTrigger)

    // Segment durations (on the unit timeline). Tuned so the wardrobe-reveal
    // peak (reveal=1) lands inside the visible #about + #projects sections,
    // and only flips back to jersey (reveal=0) once the camera has begun
    // flying to the mailroom. Approximate fractions of total scroll:
    //   hero hold  0.00 → 0.10
    //   hero→about 0.10 → 0.22  (reveal climbs 0 → 1 over the back 75%)
    //   about hold 0.22 → 0.40  (reveal stays at 1 — shirt visible)
    //   about→proj 0.40 → 0.45  (camera move only, reveal still 1)
    //   proj hold  0.45 → 0.78  (reveal stays at 1, biggest section)
    //   proj→cont  0.78 → 0.92  (reveal flips 1 → 0 over the front 70%)
    //   cont hold  0.92 → 0.96
    //   cont→foot  0.96 → 1.00
    const T_HERO_HOLD = 0.10
    const T_HERO_ABOUT = 0.12
    const T_ABOUT_HOLD = 0.18
    const T_ABOUT_PROJECTS = 0.05
    const T_PROJECTS_HOLD = 0.33
    const T_PROJECTS_CONTACT = 0.14
    const T_CONTACT_HOLD = 0.04
    const T_CONTACT_FOOTER = 0.04

    const heroAboutAt = T_HERO_HOLD
    const aboutProjectsAt = heroAboutAt + T_HERO_ABOUT + T_ABOUT_HOLD
    const projectsContactAt =
      aboutProjectsAt + T_ABOUT_PROJECTS + T_PROJECTS_HOLD
    const footerAt =
      projectsContactAt + T_PROJECTS_CONTACT + T_CONTACT_HOLD

    buildHeroToAbout(
      tl,
      HERO_STOP,
      ABOUT_STOP,
      { camera, scene, room, hologram, lookAt },
      heroAboutAt,
      T_HERO_ABOUT,
    )

    buildAboutToProjects(
      tl,
      ABOUT_STOP,
      PROJECTS_STOP,
      { camera, scene, room, hologram, lights, lookAt },
      aboutProjectsAt,
      T_ABOUT_PROJECTS,
    )

    buildProjectsToContact(
      tl,
      PROJECTS_STOP,
      CONTACT_STOP,
      { camera, scene, room, mailroom, lights, hologram, lookAt },
      projectsContactAt,
      T_PROJECTS_CONTACT,
    )

    // Contact → footer: fade lights out, background back to deep
    const bg = scene.background as Color
    const footerBg = new Color('#060a26')
    tl.to(
      bg,
      {
        r: footerBg.r,
        g: footerBg.g,
        b: footerBg.b,
        ease: 'power1.inOut',
        duration: T_CONTACT_FOOTER,
      },
      footerAt,
    )
    const todOut = { v: 0.85 }
    tl.to(
      todOut,
      {
        v: 0,
        ease: 'power1.inOut',
        duration: T_CONTACT_FOOTER,
        onUpdate: () => lights.setTimeOfDay(todOut.v),
      },
      footerAt,
    )

    // ─── Discrete pose / teleport / visibility triggers ──────────────────
    //
    // These ScrollTriggers fire single events on direction-aware boundaries
    // (onEnter, onLeaveBack), so we use them for any state that needs to
    // be coherent across forward AND reverse scroll. Tween-based callbacks
    // on the scrubbed master timeline are unreliable for this.
    //
    // States set per section:
    //   #top      → room visible, avatar in chair sitting,
    //               hologram hidden, mailroom hidden
    //   #about    → room hidden,  avatar hidden,
    //               hologram visible, mailroom hidden
    //   #projects → room visible, avatar standing in room,
    //               hologram hidden, mailroom hidden
    //   #contact  → room hidden,  avatar standing in mailroom,
    //               hologram hidden, mailroom visible

    // Phase 7C+: a single Avatar instance is teleported between the chair
    // (hero), the hologram platform (about), the room standing position
    // (projects) and the mailroom (contact). The wardrobe-reveal scan AND
    // the platform glow are driven CONTINUOUSLY by the scrubbed master
    // timeline (heroToAbout 0→1, aboutToProjects 1→0). The per-section
    // state functions below MUST NOT call hologram.setReveal — that would
    // fight the scrubbed tween every frame.

    const setHeroState = (): void => {
      room.root.visible = true
      avatar.root.visible = true
      // Hero pose: standing in front of a whiteboard, back to the camera.
      // The camera looks over his shoulder while he "studies the board".
      //   - y = 0: feet on the floor, full standing height
      //   - z = 0.6: in front of the whiteboard (mounted at z ≈ -1.4 on
      //     the back wall) so there's ~2 m of board visible in front of him
      //   - rotation.y = π: face the whiteboard (-Z direction)
      avatar.root.position.set(0, 0, 0.6)
      avatar.root.rotation.set(0, Math.PI, 0)
      avatar.play('standing')
      hologram.root.visible = false
      mailroom.visible = false
    }

    // Facing rules: Avaturn's default forward (rotation.y=0) = +Z. To make
    // the avatar face the camera we set rotation.y so the avatar's front
    // points back along the vector from him to the camera.
    //   hero      camera at +Z, avatar at z=0   → want him facing -Z (back to us, working at desk)  → rotation.y = π
    //   about     camera at z=3.5, avatar at z=8  → want -Z (toward camera) → rotation.y = π
    //   projects  camera at z=3.5, avatar at z=-0.6 → want +Z (toward camera) → rotation.y = 0
    //   contact   camera at z=19.5, avatar at z=16 → want +Z (toward camera) → rotation.y = 0

    const setAboutState = (): void => {
      room.root.visible = false
      avatar.root.visible = true
      // Teleport the avatar onto the hologram platform (parked at z=8).
      avatar.root.position.set(0, 0.05, 8)
      // Face the camera for the wardrobe-reveal close-up.
      avatar.root.rotation.set(0, Math.PI, 0)
      avatar.play('standing')
      hologram.root.visible = true
      mailroom.visible = false
    }

    const setProjectsState = (): void => {
      room.root.visible = true
      // The four project cards cover the centre of the viewport in the
      // projects section, so an avatar parked at the desk reads as a
      // tiny silhouette peeking between cards (worse than not being
      // there at all). Hide him for projects — the cards are the star.
      // TODO(phase7-projects-pose): if/when we want him back, position
      // him off to the side or much further back so he doesn't collide
      // with the cards' z-order.
      avatar.root.visible = false
      hologram.root.visible = false
      mailroom.visible = false
    }

    const setContactState = (): void => {
      room.root.visible = false
      avatar.root.visible = true
      avatar.root.position.set(0, 0, 16)
      // TODO(phase7-contact-pose): the user is going to export a dedicated
      // contact-section pose from Avaturn (probably arms-crossed standing
      // beside the cardboard packages). When the new GLB lands, swap to it
      // here and update the rotation to whatever lines up with the camera
      // angle in CONTACT_STOP.
      avatar.root.rotation.set(0, 0, 0)
      avatar.play('standing')
      hologram.root.visible = false
      mailroom.visible = true
    }

    // Apply the hero state immediately so the very first paint matches
    setHeroState()

    triggers.push(
      ScrollTrigger.create({
        trigger: '#top',
        start: 'top top',
        end: 'bottom center',
        onEnter: setHeroState,
        onEnterBack: setHeroState,
      }),
    )

    triggers.push(
      ScrollTrigger.create({
        trigger: '#about',
        start: 'top center',
        end: 'bottom center',
        onEnter: setAboutState,
        onEnterBack: setAboutState,
        onLeaveBack: setHeroState,
      }),
    )

    triggers.push(
      ScrollTrigger.create({
        trigger: '#projects',
        start: 'top center',
        end: 'bottom center',
        onEnter: setProjectsState,
        onEnterBack: setProjectsState,
        onLeaveBack: setAboutState,
      }),
    )

    triggers.push(
      ScrollTrigger.create({
        trigger: '#contact',
        start: 'top center',
        end: 'bottom center',
        onEnter: setContactState,
        onEnterBack: setContactState,
        onLeaveBack: setProjectsState,
      }),
    )
  }

  const dispose = (): void => {
    if (tickRemover) {
      tickRemover()
      tickRemover = null
    }
    if (masterTl) {
      masterTl.kill()
      masterTl = null
    }
    for (const t of triggers) {
      t.kill()
    }
    triggers.length = 0
  }

  return {
    build,
    dispose,
  }
}
