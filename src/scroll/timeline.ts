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
import {
  Color,
  CylinderGeometry,
  Mesh,
  MeshBasicMaterial,
  DoubleSide,
} from 'three'
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

// Phase 7C++: hero camera framing — pulled hard to the right (+X) and
// almost level with the avatar in z so the view is genuinely lateral,
// ¾ profile from his right side. Camera looks across his back toward
// the whiteboard on the far left of the frame.
const HERO_STOP: CameraStop = {
  // Slightly raised + tilted further down so the avatar sits lower in
  // frame (feet near screen mid-bottom, head clear of the nav).
  pos: { x: 3.4, y: 2.0, z: 1.6 },
  look: { x: -0.8, y: 1.05, z: -0.4 },
}
const ABOUT_STOP: CameraStop = {
  // Pulled back + tilted up so the avatar sits lower in frame: feet on
  // the cyan platform at screen mid-bottom, head well clear of the nav.
  pos: { x: 0, y: 2.1, z: 4.2 },
  look: { x: 0, y: 2.3, z: 8 },
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

    // Hero ground disc — a thin platter the avatar stands on during
    // hero so that when he rises with the page scroll his feet remain
    // visibly planted on something. Coloured to match the room floor
    // (#3a2419 dark wood) so it reads as a piece of the floor lifting
    // with him. Rises in lockstep with him; hidden the moment we leave
    // hero.
    const heroDiscGeo = new CylinderGeometry(0.45, 0.45, 0.02, 48)
    const heroDiscMat = new MeshBasicMaterial({
      color: 0x3a2419,
      side: DoubleSide,
    })
    const heroDisc = new Mesh(heroDiscGeo, heroDiscMat)
    heroDisc.name = 'HeroGroundDisc'
    heroDisc.position.set(0, 0.005, 0.6)
    scene.add(heroDisc)

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

    // Phase 7C++: lock the camera to HERO_STOP at the very start of the
    // master timeline (progress 0). Without this, first paint can drift
    // (parallax baseline, ResizeObserver, etc.) and only snap to the
    // canonical position once the heroToAbout tween at progress 0.10
    // engages — which doesn't happen until the user scrolls past it.
    tl.set(
      camera.position,
      { x: HERO_STOP.pos.x, y: HERO_STOP.pos.y, z: HERO_STOP.pos.z },
      0,
    )
    tl.set(
      lookAt,
      { x: HERO_STOP.look.x, y: HERO_STOP.look.y, z: HERO_STOP.look.z },
      0,
    )

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

    // Cast once for the optional setShowContact + setHeroThinking
    // extensions on Avatar.
    const avatarExt = avatar as Avatar & {
      setShowContact?: (on: boolean) => void
      setHeroThinking?: (on: boolean) => void
    }
    // Cast once for the optional setAboutLightLevel + setMailroomLightLevel
    // extensions on RoomLights.
    const lightsExt = lights as RoomLights & {
      setAboutLightLevel?: (v: number) => void
      setMailroomLightLevel?: (v: number) => void
    }

    const setHeroState = (): void => {
      lightsExt.setAboutLightLevel?.(0)
      lightsExt.setMailroomLightLevel?.(0)
      room.root.visible = true
      // Restore room Y in case the about-sink scrub left it offscreen
      // and the user landed on hero via direct nav.
      room.root.position.y = 0
      heroDisc.visible = true
      heroDisc.position.y = 0.005
      avatar.root.visible = true
      // Hero pose: standing in front of a whiteboard, back to the camera.
      // The camera looks over his shoulder while he "studies the board".
      //   - y = 0: feet on the floor, full standing height
      //   - z = 0.6: in front of the whiteboard (mounted at z ≈ -1.4 on
      //     the back wall) so there's ~2 m of board visible in front of him
      //   - rotation.y = π: face the whiteboard (-Z direction)
      avatar.root.position.set(-0.1, 0, -0.5)
      avatar.root.rotation.set(0, Math.PI, 0)
      avatar.play('standing')
      avatarExt.setShowContact?.(false)
      avatarExt.setHeroThinking?.(true)
      // Hologram visibility is owned by the wide-range about trigger
      // below — do NOT toggle it here, otherwise the conjoining circular
      // reveal flickers off the moment hero re-enters.
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
      lightsExt.setAboutLightLevel?.(1)
      lightsExt.setMailroomLightLevel?.(0)
      room.root.visible = false
      avatar.root.visible = true
      // Teleport the avatar onto the hologram platform (parked at z=8).
      avatar.root.position.set(0, 0.05, 8)
      // Face the camera for the wardrobe-reveal close-up.
      avatar.root.rotation.set(0, Math.PI, 0)
      avatar.play('standing')
      avatarExt.setShowContact?.(false)
      avatarExt.setHeroThinking?.(false)
      // hologram.root.visible owned by wide-range about trigger.
      mailroom.visible = false
      heroDisc.visible = false
    }

    const setProjectsState = (): void => {
      lightsExt.setAboutLightLevel?.(0)
      lightsExt.setMailroomLightLevel?.(0)
      room.root.visible = true
      // The four project cards cover the centre of the viewport in the
      // projects section, so an avatar parked at the desk reads as a
      // tiny silhouette peeking between cards (worse than not being
      // there at all). Hide him for projects — the cards are the star.
      avatar.root.visible = false
      avatarExt.setShowContact?.(false)
      avatarExt.setHeroThinking?.(false)
      // hologram.root.visible owned by wide-range about trigger.
      mailroom.visible = false
      heroDisc.visible = false
    }

    const setContactState = (): void => {
      lightsExt.setAboutLightLevel?.(0)
      lightsExt.setMailroomLightLevel?.(1)
      room.root.visible = false
      avatar.root.visible = true
      // The contact section's HTML overlay scrims the LEFT half of the
      // viewport for text legibility. Park the avatar at world x=+0.55
      // so his outstretched left arm hovers directly over the football
      // pedestal at mailroom local x=0.88. Matched to the empirical
      // hand world position (~0.88, 1.30, 16.78) from earlier closeups.
      avatar.root.position.set(0.55, 0, 16)
      // The bundled contact-pose animation has the head turned ~25° toward
      // the avatar's left. Counter-rotate the body by the same amount so
      // the head squares back to the camera while his left arm naturally
      // points toward camera-right where the lean-box is parked.
      avatar.root.rotation.set(0, -0.42, 0)
      avatar.play('standing')
      // Snap-swap to the contact-only jersey mesh (different pose from
      // the wardrobe-reveal jersey). The scan duo is hidden while this
      // is active.
      avatarExt.setShowContact?.(true)
      avatarExt.setHeroThinking?.(false)
      // hologram.root.visible owned by wide-range about trigger.
      mailroom.visible = true
      heroDisc.visible = false
    }

    // Apply the hero state immediately so the very first paint matches
    setHeroState()
    // Hologram FX hidden until #about scrolls into view (driven by the
    // wide-range trigger below).
    hologram.root.visible = false

    // Hero exit: as #about scrolls in from the bottom:
    //   - the SETUP (room + desk + whiteboard) sinks DOWN out of frame
    //   - the AVATAR rises UP with the page content, his feet planted
    //     on the cyan ground disc which lifts in lockstep
    // Same scroll-up motion as the white-shirt avatar in #about, so the
    // two transitions feel symmetric.
    const roomBaseY = room.root.position.y
    triggers.push(
      ScrollTrigger.create({
        trigger: '#about',
        // Small delay: instead of starting at the very first pixel of
        // scroll, wait until #about's top has climbed roughly 15% into
        // the viewport before the hero begins exiting.
        start: 'top 85%',
        end: 'top 15%',
        scrub: true,
        onUpdate: (self) => {
          const p = self.progress
          room.root.position.y = roomBaseY - 6 * p
          const lift = 2.2 * p
          avatar.root.position.y = lift
          heroDisc.position.y = 0.005 + lift
        },
      }),
    )

    // Wardrobe scan-reveal — happens INSIDE the about section, on the
    // shirt avatar standing on the platform (NOT during the hero exit).
    // Starts only once setAboutState has fired (#about top hits viewport
    // centre) and spans 700px of scroll so the scan is slow enough to
    // read. The hero section stays pure jersey with zero shader effects.
    triggers.push(
      ScrollTrigger.create({
        trigger: '#about',
        start: 'top center',
        end: '+=700',
        scrub: 1.2,
        onUpdate: (self) => {
          hologram.setReveal(self.progress)
        },
      }),
    )

    // Wide-range visibility trigger: keep the hologram FX (platform disc
    // + dotted grid) visible from the moment #about's top hits the
    // viewport bottom until its bottom leaves the top. The scrubbed
    // master timeline already drives `setReveal(0→1→0)` over the same
    // range, so the circular ring grows in continuously during scroll-
    // down (conjoining hero into about) and shrinks back out the same
    // way on scroll-up.
    triggers.push(
      ScrollTrigger.create({
        trigger: '#about',
        start: 'top bottom',
        end: 'bottom top',
        onEnter: () => {
          hologram.root.visible = true
        },
        onEnterBack: () => {
          hologram.root.visible = true
        },
        onLeave: () => {
          hologram.root.visible = false
        },
        onLeaveBack: () => {
          hologram.root.visible = false
        },
      }),
    )

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

    // Dedicated 1:1 scrub trigger so the avatar + hologram platform
    // travel upward at the exact same rate as the #about HTML overlay.
    // The master timeline's scrub:1.5 introduces ~1.5s of smoothing lag,
    // which makes the 3D rig feel like it's chasing the text. A separate
    // trigger with scrub:true removes that lag.
    //
    // Range: 'top center' (avatar fully visible, base y) → 'bottom center'
    // (section leaving, avatar lifted out of frame). Tighter than the
    // top-bottom→bottom-top window, so the rise tracks the section's
    // visible scroll exactly instead of pre-rising before it's read.
    const RISE_BASE_Y = 0.05
    const RISE_TOP_Y = 2.4
    triggers.push(
      ScrollTrigger.create({
        trigger: '#about',
        start: 'top center',
        end: 'bottom center',
        scrub: true,
        onUpdate: (self) => {
          const y = RISE_BASE_Y + (RISE_TOP_Y - RISE_BASE_Y) * self.progress
          avatar.root.position.y = y
          hologram.root.position.y = y - RISE_BASE_Y
        },
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

    // Phase 7C++: force GSAP to apply the timeline's progress-0 state on
    // first paint (the tl.set above plus any tween from-states). Without
    // this the camera doesn't snap to HERO_STOP until the user scrolls
    // forward past the heroToAbout tween at progress 0.10.
    tl.progress(0)
    ScrollTrigger.refresh()
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
