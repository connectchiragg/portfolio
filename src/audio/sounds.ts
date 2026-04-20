/**
 * sounds.ts — Site-wide ambient audio with section cross-fade.
 *
 * Two tracks: jazz-warm (hero/projects/contact) and jazz-cool (about section).
 * Cross-fades between them when entering/leaving the about section.
 * Starts on first user interaction (browser autoplay policy).
 * Mute state persists to localStorage.
 */

import { Howl, Howler } from 'howler'

const STORAGE_KEY = 'portfolio-muted'
const FADE_MS = 1500
const BLUR_FADE_MS = 400 // quick but not abrupt fade on window blur
const VOLUME = 0.35
const LOOP_XFADE_MS = 3000 // crossfade overlap near end of each track

let warm: Howl | null = null
let cool: Howl | null = null
let coolPlaying = false
let started = false
let muted = localStorage.getItem(STORAGE_KEY) === 'true'
let activeTrack: 'warm' | 'cool' = 'warm'
let wasMutedBeforeBlur = false
let loopTimers: number[] = []

/** Schedule a crossfade-loop: near the end, fade out and start a fresh play that fades in. */
function scheduleLoopCrossfade(howl: Howl, getVolume: () => number): void {
  const check = () => {
    if (!howl.playing()) return
    const dur = howl.duration()
    const pos = howl.seek() as number
    const remaining = dur - pos
    if (dur > 0 && remaining <= LOOP_XFADE_MS / 1000 + 0.1) {
      const vol = getVolume()
      if (vol > 0) {
        // Fade out current play, start a new one that fades in
        howl.fade(vol, 0, LOOP_XFADE_MS)
        const newId = howl.play()
        howl.volume(0, newId)
        howl.fade(0, vol, LOOP_XFADE_MS, newId)
      }
    }
    const timer = window.setTimeout(check, 500)
    loopTimers.push(timer)
  }
  const timer = window.setTimeout(check, 500)
  loopTimers.push(timer)
}

function getWarm(): Howl {
  if (!warm) {
    warm = new Howl({
      src: ['/audio/jazz-warm.mp3'],
      loop: true,
      volume: VOLUME,
    })
    scheduleLoopCrossfade(warm, () => activeTrack === 'warm' ? VOLUME : 0)
  }
  return warm
}

function getCool(): Howl {
  if (!cool) {
    cool = new Howl({
      src: ['/audio/jazz-cool.mp3'],
      loop: true,
      volume: 0,
    })
    scheduleLoopCrossfade(cool, () => activeTrack === 'cool' ? VOLUME : 0)
  }
  return cool
}

/** Fade audio on window/tab blur, restore on focus. */
function onVisibilityChange(): void {
  if (!started) return
  if (document.hidden) {
    wasMutedBeforeBlur = muted
    if (!muted) {
      // Quick fade to silence instead of abrupt mute
      warm?.fade(warm.volume(), 0, BLUR_FADE_MS)
      cool?.fade(cool.volume(), 0, BLUR_FADE_MS)
    }
  } else {
    if (!wasMutedBeforeBlur) {
      // Fade back up to the correct levels
      const warmTarget = activeTrack === 'warm' ? VOLUME : 0
      const coolTarget = activeTrack === 'cool' ? VOLUME : 0
      warm?.fade(warm.volume(), warmTarget, BLUR_FADE_MS)
      cool?.fade(cool.volume(), coolTarget, BLUR_FADE_MS)
    }
  }
}

/** Start playback (call on first user gesture). */
export function startAudio(): void {
  if (started) return
  started = true
  if (muted) {
    Howler.mute(true)
  }
  getWarm().play()
  activeTrack = 'warm'
  document.addEventListener('visibilitychange', onVisibilityChange)
}

/** Cross-fade to the about-section sci-fi track. */
export function fadeToAbout(): void {
  if (!started || activeTrack === 'cool') return
  activeTrack = 'cool'
  const w = getWarm()
  const c = getCool()
  if (!coolPlaying) {
    c.play()
    coolPlaying = true
  }
  w.fade(w.volume(), 0, FADE_MS)
  c.fade(c.volume(), VOLUME, FADE_MS)
}

/** Cross-fade back to the warm jazz track. */
export function fadeToWarm(): void {
  if (!started || activeTrack === 'warm') return
  activeTrack = 'warm'
  const w = getWarm()
  const c = getCool()
  c.fade(c.volume(), 0, FADE_MS)
  w.fade(w.volume(), VOLUME, FADE_MS)
}

/** Toggle mute and persist choice. */
export function toggleMute(): boolean {
  muted = !muted
  Howler.mute(muted)
  localStorage.setItem(STORAGE_KEY, String(muted))
  return muted
}

/** Current mute state. */
export function isMuted(): boolean {
  return muted
}

/** Clean up. */
export function disposeAudio(): void {
  document.removeEventListener('visibilitychange', onVisibilityChange)
  for (const t of loopTimers) clearTimeout(t)
  loopTimers = []
  warm?.unload()
  cool?.unload()
  warm = null
  cool = null
  coolPlaying = false
  started = false
}
