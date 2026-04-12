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
const VOLUME = 0.35

let warm: Howl | null = null
let cool: Howl | null = null
let coolPlaying = false
let started = false
let muted = localStorage.getItem(STORAGE_KEY) === 'true'
let activeTrack: 'warm' | 'cool' = 'warm'

function getWarm(): Howl {
  if (!warm) {
    warm = new Howl({
      src: ['/audio/jazz-warm.mp3'],
      loop: true,
      volume: VOLUME,
    })
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
  }
  return cool
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
  warm?.unload()
  cool?.unload()
  warm = null
  cool = null
  coolPlaying = false
  started = false
}
