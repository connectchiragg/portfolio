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

    // Segment durations (on the unit timeline). These are tuned to match the
    // actual HTML section heights so the 3D camera moves stay aligned with
    // the section the user is reading. Approximate fractions of total scroll:
    //   hero    ~25% (0.00 → 0.20)
    //   about   ~24% (0.20 → 0.40)
    //   projects ~51% (0.40 → 0.85)  ← biggest section, 4 project cards
    //   contact  ~5%  (0.85 → 0.96)
    //   footer   ~4%  (0.96 → 1.00)
    // The hero stop holds for the first 0–0.20 of the timeline by starting
    // the heroToAbout transition only at progress 0.05 (so hero idles briefly
    // before the camera starts moving).
    const T_HERO_HOLD = 0.05
    const T_HERO_ABOUT = 0.15
    const T_ABOUT_HOLD = 0.05
    const T_ABOUT_PROJECTS = 0.15
    const T_PROJECTS_HOLD = 0.30
    const T_PROJECTS_CONTACT = 0.15
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
      { camera, scene, room, mailroom, lights, lookAt },
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

    const setHeroState = (): void => {
      room.root.visible = true
      avatar.root.visible = true
      avatar.root.position.set(0, 0, -0.6)
      avatar.play('sitting')
      hologram.root.visible = false
      mailroom.visible = false
    }

    const setAboutState = (): void => {
      room.root.visible = false
      avatar.root.visible = false
      hologram.root.visible = true
      mailroom.visible = false
    }

    const setProjectsState = (): void => {
      room.root.visible = true
      avatar.root.visible = true
      avatar.root.position.set(0, 0, -0.6)
      avatar.play('standing')
      hologram.root.visible = false
      mailroom.visible = false
    }

    const setContactState = (): void => {
      room.root.visible = false
      avatar.root.visible = true
      avatar.root.position.set(0, 0, 16)
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
