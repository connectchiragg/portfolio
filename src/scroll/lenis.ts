/**
 * Lenis ↔ GSAP scroll bridge.
 *
 * Single source of truth for scroll on "Late Night, Bengaluru". Implements
 * the {@link ScrollContext} contract from `src/three/contracts.d.ts`.
 *
 * The bridge pattern here is deliberate and must not be substituted with
 * `requestAnimationFrame`:
 *   1. `lenis.on('scroll', ScrollTrigger.update)` — pipes Lenis scroll
 *      events straight into GSAP ScrollTrigger so pins/scrubs stay in sync.
 *   2. `gsap.ticker.add((time) => lenis.raf(time * 1000))` — drives
 *      Lenis's RAF loop from GSAP's ticker (shared clock).
 *   3. `gsap.ticker.lagSmoothing(0)` — disables lag smoothing so Lenis
 *      receives real timestamps.
 *
 * Owned by W3 (Phase 1 — Scroll layer).
 */

import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import type { ScrollContext } from '../three/contracts'

gsap.registerPlugin(ScrollTrigger)

export function createScroll(): ScrollContext {
  const lenis = new Lenis({ smoothWheel: true, lerp: 0.12 })

  const tickCallbacks = new Set<() => void>()

  lenis.on('scroll', ScrollTrigger.update)
  lenis.on('scroll', () => {
    tickCallbacks.forEach((cb) => cb())
  })

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)

  const onTick = (cb: () => void): (() => void) => {
    tickCallbacks.add(cb)
    return () => {
      tickCallbacks.delete(cb)
    }
  }

  const progress = (): number => {
    const limit = Math.max(1, lenis.limit)
    const p = lenis.scroll / limit
    return p < 0 ? 0 : p > 1 ? 1 : p
  }

  return {
    lenis,
    progress,
    onTick,
  }
}
