/**
 * Master scroll timeline — Phase 1 skeleton.
 *
 * Implements the {@link MasterTimeline} contract from
 * `src/three/contracts.d.ts`. This is intentionally a stub: it creates
 * exactly one test ScrollTrigger against the `#about` anchor to prove the
 * Lenis ↔ GSAP bridge is live, and nothing else.
 *
 * W8 (Phase 4) will replace `build()` with the real camera curve,
 * background lerp, time-of-day lighting, and section transitions.
 *
 * Owned by W3 (Phase 1 — Scroll layer skeleton).
 */

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type {
  MasterTimeline,
  SceneContext,
  Room,
  Avatar,
  Hologram,
  RoomLights,
} from '../three/contracts'

gsap.registerPlugin(ScrollTrigger)

interface BuildDeps {
  sceneCtx: SceneContext
  room: Room
  avatar: Avatar
  hologram: Hologram
  lights: RoomLights
}

export function createTimeline(): MasterTimeline {
  const triggers: ScrollTrigger[] = []

  const build = (_deps: BuildDeps): void => {
    void _deps

    const st = ScrollTrigger.create({
      trigger: '#about',
      start: 'top center',
      end: 'bottom center',
      onEnter: () => {},
      onLeave: () => {},
      onEnterBack: () => {},
      onLeaveBack: () => {},
    })

    triggers.push(st)
  }

  const dispose = (): void => {
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
