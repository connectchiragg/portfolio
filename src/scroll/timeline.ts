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
import { fadeToAbout, fadeToWarm } from '../audio/sounds'
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
// Bird's-eye: heroToAbout tween lands the camera here.
// Camera elevated but look target at avatar chest height so the
// avatar is centered in the bird's-eye view, not just the floor.
const ABOUT_TOP: CameraStop = {
  pos: { x: 0, y: 4.5, z: 5.0 },
  look: { x: 0, y: 1.5, z: 8 },
}
// Front/eye-level: elevator Phase 1 descends camera here.
// Phase 2 lifts everything from here. Also used as aboutToProjects `from`.
const ABOUT_FRONT: CameraStop = {
  pos: { x: 0, y: 2.0, z: 4.0 },
  look: { x: 0, y: 1.2, z: 8 },
}
const PROJECTS_STOP: CameraStop = {
  pos: { x: 0, y: 1.6, z: 3.5 },
  look: { x: 0, y: 1.2, z: 0 },
}
// Contact uses the same camera as projects — the mailroom lifts into view
const CONTACT_STOP: CameraStop = {
  pos: { x: 0, y: 1.6, z: 3.5 },
  look: { x: 0, y: 1.2, z: 0 },
}

export function createTimeline(): MasterTimeline {
  const triggers: ScrollTrigger[] = []
  let masterTl: gsap.core.Timeline | null = null
  let tickRemover: (() => void) | null = null
  let heroExitTickRemover: (() => void) | null = null
  let aboutElevatorTickRemover: (() => void) | null = null
  let contactElevatorTickRemover: (() => void) | null = null

  const build = (deps: BuildDeps): void => {
    const { sceneCtx, room, avatar, hologram, lights, mailroom } = deps
    const { scene, camera } = sceneCtx

    // Force scroll to top before building the timeline — prevents the
    // scrubbed ScrollTrigger from reading a stale browser-restored
    // scroll position and starting the camera mid-scene.
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })

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
    heroDisc.position.set(-0.1, 0.005, -0.5)
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
        scrub: 1.0,
      },
    })
    masterTl = tl
    if (tl.scrollTrigger) triggers.push(tl.scrollTrigger)

    // Segment durations (on the unit timeline). Tuned so the wardrobe-reveal
    // peak (reveal=1) lands inside the visible #about + #projects sections,
    // and only flips back to jersey (reveal=0) once the camera has begun
    // flying to the mailroom. Approximate fractions of total scroll:
    //   hero hold  0.00 → 0.08
    //   hero→about 0.08 → 0.20  (reveal climbs 0 → 1 over the back 75%)
    //   about hold 0.20 → 0.36  (reveal stays at 1 — shirt visible)
    //   about→proj 0.36 → 0.41  (camera move only, reveal still 1)
    //   proj hold  0.41 → 0.71  (reveal stays at 1, biggest section)
    //   proj→cont  0.71 → 0.85  (reveal flips 1 → 0 over the front 70%)
    //   cont hold  0.85 → 0.93
    //   cont→foot  0.93 → 1.00
    const T_HERO_HOLD = 0.08
    const T_HERO_ABOUT = 0.12
    const T_ABOUT_HOLD = 0.16
    const T_ABOUT_PROJECTS = 0.10
    const T_PROJECTS_HOLD = 0.25
    const T_PROJECTS_CONTACT = 0.14
    const T_CONTACT_HOLD = 0.08
    const T_CONTACT_FOOTER = 0.07

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

    // Camera: hero → bird's eye → front view as ONE keyframed tween.
    // Single tween with keyframes = no competing tweens = no snap.
    buildHeroToAbout(
      tl,
      HERO_STOP,
      ABOUT_TOP,
      { camera, scene, room, hologram, lookAt },
      heroAboutAt,
      T_HERO_ABOUT * 0.45, // reach bird's eye at 45% of the transition
    )
    // Start descent right after bird's eye is reached
    const aboutDescentAt = heroAboutAt + T_HERO_ABOUT * 0.45
    // Stretch descent all the way to the aboutToProjects boundary so
    // there's no dead zone between descent finishing and Phase 2 lift.
    const T_ABOUT_DESCENT = (aboutProjectsAt - aboutDescentAt)
    tl.to(
      camera.position,
      {
        x: ABOUT_FRONT.pos.x,
        y: ABOUT_FRONT.pos.y,
        z: ABOUT_FRONT.pos.z,
        ease: 'power2.out',
        duration: T_ABOUT_DESCENT,
        immediateRender: false,
      },
      aboutDescentAt,
    )
    tl.to(
      lookAt,
      {
        x: ABOUT_FRONT.look.x,
        y: ABOUT_FRONT.look.y,
        z: ABOUT_FRONT.look.z,
        ease: 'power2.out',
        duration: T_ABOUT_DESCENT,
        immediateRender: false,
      },
      aboutDescentAt,
    )

    buildAboutToProjects(
      tl,
      ABOUT_FRONT,
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
        ease: 'power2.inOut',
        duration: T_CONTACT_FOOTER,
      },
      footerAt,
    )
    const todOut = { v: 0.85 }
    tl.to(
      todOut,
      {
        v: 0,
        ease: 'power2.inOut',
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


    let heroExitDone = false

    const setHeroState = (): void => {
      heroExitDone = false // re-enable the exit tick for next scroll
      // hologram.setReveal driven by scrubbed master timeline — do NOT
      // set it discretely here or it fights the tween every frame.
      fadeToWarm()
      lights.setAboutLightLevel?.(0)
      lights.setMailroomLightLevel?.(0)
      room.root.visible = true
      // Restore room Y in case the exit lift left it offscreen
      room.root.position.y = 0
      heroDisc.visible = true
      heroDisc.position.y = 0.005
      // Re-parent avatar to scene root (may have been inside mailroom)
      scene.add(avatar.root)
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
      avatar.setShowContact?.(false)
      avatar.setHeroThinking?.(true)
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
      // Stop the hero exit tick from touching the avatar — about owns it now
      heroExitDone = true
      fadeToAbout()
      lights.setAboutLightLevel?.(1)
      lights.setMailroomLightLevel?.(0)
      room.root.visible = false
      heroDisc.visible = false
      // Re-parent avatar to scene root (may have been inside mailroom)
      scene.add(avatar.root)
      avatar.root.visible = true
      // Teleport the avatar onto the hologram platform (parked at z=8).
      avatar.root.position.set(0, 0.15, 8)
      avatar.root.rotation.set(0, Math.PI, 0)
      avatar.play('standing')
      avatar.setShowContact?.(false)
      avatar.setHeroThinking?.(false)
      hologram.root.position.y = 0
      // hologram.setReveal driven by scrubbed master timeline — do NOT
      // set it discretely here or it fights the tween every frame.
      // hologram.root.visible owned by wide-range about trigger.
      mailroom.visible = false
    }

    const setProjectsState = (): void => {
      // hologram.setReveal driven by scrubbed master timeline — do NOT
      // set it discretely here or it fights the tween every frame.
      fadeToWarm()
      lights.setAboutLightLevel?.(0)
      lights.setMailroomLightLevel?.(0)
      room.root.visible = false
      // Re-parent avatar to scene root (may have been inside mailroom)
      scene.add(avatar.root)
      // The four project cards cover the centre of the viewport in the
      // projects section, so an avatar parked at the desk reads as a
      // tiny silhouette peeking between cards (worse than not being
      // there at all). Hide him for projects — the cards are the star.
      avatar.root.visible = false
      avatar.setShowContact?.(false)
      avatar.setHeroThinking?.(false)
      // hologram.root.visible owned by wide-range about trigger.
      // Pre-show mailroom so it's ready when the camera flies toward it
      // during projectsToContact — avoids the pop.
      mailroom.visible = true
      heroDisc.visible = false
    }

    const setContactState = (): void => {
      lights.setAboutLightLevel?.(0)
      lights.setMailroomLightLevel?.(1)
      room.root.visible = false
      avatar.root.visible = true
      // Parent avatar inside the mailroom group so it lifts as one unit.
      // Position is local to the mailroom group now.
      mailroom.add(avatar.root)
      avatar.root.position.set(0.55, 0, 0)
      avatar.root.rotation.set(0, -0.42, 0)
      avatar.play('standing')
      avatar.setShowContact?.(true)
      avatar.setHeroThinking?.(false)
      mailroom.visible = true
      heroDisc.visible = false
    }

    // Apply the hero state immediately so the very first paint matches
    setHeroState()
    // Hologram FX hidden until #about scrolls into view (driven by the
    // wide-range trigger below).
    hologram.root.visible = false

    // Hero exit: the entire hero scene lifts UP in perfect sync with
    // the page scroll. Uses a per-frame tick reading raw scroll
    // position (bypassing Lenis smoothing lag) so the 3D scene
    // moves at exactly the same rate as the HTML text.
    const roomBaseY = room.root.position.y
    const aboutEl = document.querySelector('#about') as HTMLElement
    const SCROLL_LIFT = 4.0
    heroExitTickRemover = sceneCtx.onTick(() => {
      if (!aboutEl || heroExitDone) return
      const rect = aboutEl.getBoundingClientRect()
      const vh = window.innerHeight
      // p = 0 when #about top is at viewport bottom, 1 at viewport top
      const p = Math.max(0, Math.min(1, 1 - rect.top / vh))
      if (p <= 0) return // not started yet
      const lift = SCROLL_LIFT * p
      room.root.position.y = roomBaseY + lift
      avatar.root.position.y = lift
      heroDisc.position.y = 0.005 + lift
      if (p >= 0.75) {
        // Fully off-screen — hide room and transition to about
        room.root.visible = false
        heroDisc.visible = false
        avatar.setHeroThinking?.(false)
        heroExitDone = true
        // Now safe to show about — room is off-screen
        hologram.root.visible = true
        setAboutState()
      }
    })

    // Scroll-driven laser ring — sweeps up the avatar as the user
    // scrolls through the about section. Purely visual, doesn't
    // change the outfit (outfit scan is rotation-driven in Hologram tick).
    const scanPctEl = document.querySelector('#scan-pct') as HTMLElement | null
    triggers.push(
      ScrollTrigger.create({
        trigger: '#about',
        start: 'top 45%',
        end: 'top -15%',
        scrub: 1.0,
        onUpdate: (self) => {
          hologram.setLaserProgress?.(self.progress)
          // Update scan percentage readout
          if (scanPctEl) {
            const pct = Math.round(self.progress * 100)
            scanPctEl.textContent = `${pct}%`
            scanPctEl.style.color = pct >= 100 ? '#4ad8ff' : ''
          }
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
        start: 'top 60%',
        end: 'bottom top',
        onEnter: () => {
          hologram.root.visible = true
          setAboutState()
        },
        onEnterBack: () => {
          hologram.root.visible = true
          setAboutState()
        },
        onLeave: () => {
          hologram.root.visible = false
          fadeToWarm()
        },
        onLeaveBack: () => {
          hologram.root.visible = false
          setHeroState()
        },
      }),
    )

    // Hero state is restored by the hologram trigger's onLeaveBack
    // (when #about top scrolls back past 60%). No separate #top trigger
    // needed — having two triggers calling setHeroState caused races.

    // ─── About section object lift ──────────────────────────────────────
    // GSAP owns all camera movement (hero→aboutTop→aboutFront→projects).
    // This tick ONLY lifts the avatar + hologram objects upward once the
    // about section starts scrolling past the viewport top, matching the
    // HTML content scroll rate via worldPerPx conversion.
    {
      const fovRad = camera.fov * Math.PI / 180
      const avatarZ = 8
      const camToAvatar = avatarZ - ABOUT_FRONT.pos.z

      aboutElevatorTickRemover = sceneCtx.onTick(() => {
        if (!aboutEl || !heroExitDone) return
        const rect = aboutEl.getBoundingClientRect()
        const vh = window.innerHeight
        if (rect.bottom < 0 || rect.top > vh) return

        if (rect.top >= 0) {
          // About section is entering or re-entering (scroll-back) —
          // objects at base position, ensure visible
          avatar.root.position.y = 0.15
          hologram.root.position.y = 0
          avatar.root.visible = true
          hologram.root.visible = true
        } else {
          // About section scrolling past — lift objects up
          const worldPerPx = (2 * camToAvatar * Math.tan(fovRad / 2)) / vh
          const scrolledPx = -rect.top
          const lift = scrolledPx * worldPerPx * 0.82

          avatar.root.position.y = 0.15 + lift
          hologram.root.position.y = lift

          // Show/hide based on how far we've scrolled past
          const sectionH = aboutEl.offsetHeight
          const p = Math.max(0, Math.min(1, -rect.top / (sectionH - vh)))
          if (p >= 0.99) {
            avatar.root.visible = false
            hologram.root.visible = false
          } else {
            // Re-show on scroll-back (p drops below 0.95)
            avatar.root.visible = true
            hologram.root.visible = true
          }
        }
      })
    }

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

    // ─── Contact section elevator lift ────────────────────────────────────
    // The mailroom group starts at y=-6 (below camera). As the #contact
    // section scrolls into the viewport, the group lifts upward so it
    // rises into view like an elevator floor arriving. Camera stays put.
    {
      const contactEl = document.querySelector('#contact') as HTMLElement
      const MAILROOM_BASE_Y = -6

      contactElevatorTickRemover = sceneCtx.onTick(() => {
        if (!contactEl || !mailroom.visible) return
        const rect = contactEl.getBoundingClientRect()
        const vh = window.innerHeight
        if (rect.bottom < 0 || rect.top > vh) return

        // p = 0 when #contact top hits viewport bottom, 1 at viewport top
        const p = Math.max(0, Math.min(1, 1 - rect.top / vh))

        // Lift the mailroom group so it rises from below into the camera frame.
        // Stop at y=0 so camera (y=1.6) sees the full room from the front.
        const targetY = 0
        const totalLift = targetY - MAILROOM_BASE_Y
        mailroom.position.y = MAILROOM_BASE_Y + totalLift * p
      })
    }

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
    if (heroExitTickRemover) {
      heroExitTickRemover()
      heroExitTickRemover = null
    }
    if (aboutElevatorTickRemover) {
      aboutElevatorTickRemover()
      aboutElevatorTickRemover = null
    }
    if (contactElevatorTickRemover) {
      contactElevatorTickRemover()
      contactElevatorTickRemover = null
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
