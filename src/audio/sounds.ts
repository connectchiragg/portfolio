/**
 * sounds — AudioController backed by howler.js.
 *
 * Implements the `AudioController` contract from `src/three/contracts.d.ts`.
 * Ambient beds (`jazz-warm`, `jazz-cool`) cross-fade on `to()`; one-shot UI
 * cues are lazily instantiated in `cue()`. A single `AnalyserNode` is tapped
 * off the Howler master gain so the hologram can pulse to the bass.
 *
 * All Howler instances use `onloaderror` to silently swallow missing audio
 * files — the orchestrator will drop real jazz tracks into `public/audio/`
 * later and everything will start producing sound automatically.
 *
 * Owned by W10.
 */

// howler ships no TypeScript types and @types/howler is not installed.
// We define the minimal surface area we touch here and cast the runtime
// import through it. This keeps our code type-safe without leaking `any`.
interface HowlOptions {
  src: string[]
  loop?: boolean
  volume?: number
  html5?: boolean
  preload?: boolean
  onloaderror?: (id: number, error: unknown) => void
  onplayerror?: (id: number, error: unknown) => void
}

interface HowlInstance {
  play(): number
  stop(): HowlInstance
  pause(): HowlInstance
  volume(): number
  volume(v: number): HowlInstance
  playing(): boolean
  unload(): void
  state(): 'unloaded' | 'loading' | 'loaded'
}

interface HowlCtor {
  new (options: HowlOptions): HowlInstance
}

interface HowlerStatic {
  ctx: AudioContext
  masterGain: GainNode
  mute(muted: boolean): void
  volume(v?: number): number
  unload(): void
}

// @types/howler is installed; cast through unknown to keep the local
// HowlOptions/HowlInstance shapes (which carry the bits we actually need
// for ambient cross-fading and the masterGain analyser tap).
import { Howl as HowlRuntime, Howler as HowlerRuntime } from 'howler'
const Howl = HowlRuntime as unknown as HowlCtor
const Howler = HowlerRuntime as unknown as HowlerStatic

import type {
  AudioController,
  AudioTrack,
} from '../three/contracts'
import { crossfade } from './crossfade'

// ─── Constants ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'muted'
const DEFAULT_TRACK_VOLUME = 0.4
const DEFAULT_CUE_VOLUME = 0.6
const DEFAULT_FADE_MS = 1500

type CueName = 'click' | 'hat-sting' | 'ball-thud' | 'lamp-click'

const TRACK_SOURCES: Record<AudioTrack, string[]> = {
  'jazz-warm': ['/audio/jazz-warm.mp3', '/audio/jazz-warm.ogg'],
  'jazz-cool': ['/audio/jazz-cool.mp3', '/audio/jazz-cool.ogg'],
}

const CUE_SOURCES: Record<CueName, string[]> = {
  click: ['/audio/click.mp3', '/audio/click.ogg'],
  'hat-sting': ['/audio/hat-sting.mp3', '/audio/hat-sting.ogg'],
  'ball-thud': ['/audio/ball-thud.mp3', '/audio/ball-thud.ogg'],
  'lamp-click': ['/audio/lamp-click.mp3', '/audio/lamp-click.ogg'],
}

// ─── Factory ─────────────────────────────────────────────────────────────

export function createAudio(): AudioController {
  const tracks = new Map<AudioTrack, HowlInstance>()
  const cues = new Map<CueName, HowlInstance>()

  let started = false
  let currentTrack: AudioTrack | null = null
  let analyser: AnalyserNode | null = null

  // Persisted mute state — read once up front.
  let muted = readMutedFromStorage()
  Howler.mute(muted)

  // User-preferred ambient volume. Right now this is fixed; a future
  // settings panel could write to this slot.
  const trackVolume = DEFAULT_TRACK_VOLUME

  function readMutedFromStorage(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  }

  function writeMutedToStorage(value: boolean): void {
    try {
      localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      /* storage disabled — ignore */
    }
  }

  function makeTrack(track: AudioTrack): HowlInstance {
    return new Howl({
      src: TRACK_SOURCES[track],
      loop: true,
      html5: false,
      volume: 0,
      preload: true,
      onloaderror: (_id, _err) => {
        // Missing audio file — expected during Phase 2 before the
        // orchestrator drops the real jazz bed into `public/audio/`.
        // No-op so `play()` / `volume()` calls stay safe.
      },
      onplayerror: (_id, _err) => {
        /* autoplay blocked or missing — silently ignore */
      },
    })
  }

  function makeCue(name: CueName): HowlInstance {
    return new Howl({
      src: CUE_SOURCES[name],
      loop: false,
      html5: false,
      volume: DEFAULT_CUE_VOLUME,
      preload: true,
      onloaderror: (_id, _err) => {
        /* missing cue file — silent no-op */
      },
      onplayerror: (_id, _err) => {
        /* silently ignore */
      },
    })
  }

  function getTrack(track: AudioTrack): HowlInstance {
    let howl = tracks.get(track)
    if (howl == null) {
      howl = makeTrack(track)
      tracks.set(track, howl)
    }
    return howl
  }

  async function begin(): Promise<void> {
    if (started) return
    started = true

    // Instantiate both ambient beds so cross-fading to the cool track
    // later is instant (no first-play load hitch).
    const warm = getTrack('jazz-warm')
    getTrack('jazz-cool')

    currentTrack = 'jazz-warm'

    try {
      warm.play()
      warm.volume(muted ? 0 : trackVolume)
    } catch (err) {
      console.warn('[audio] failed to start ambient bed', err)
    }
  }

  function to(track: AudioTrack, durationMs: number = DEFAULT_FADE_MS): void {
    if (!started) return
    if (track === currentTrack) return

    const next = getTrack(track)
    const prev = currentTrack != null ? tracks.get(currentTrack) ?? null : null

    // Bring the next track up from 0 (its default starting volume) and
    // let crossfade tween it up to the user volume while prev fades out.
    try {
      next.volume(0)
      next.play()
    } catch (err) {
      console.warn('[audio] failed to start next track', err)
    }

    crossfade(prev, next, muted ? 0 : trackVolume, durationMs)
    currentTrack = track
  }

  function setMuted(value: boolean): void {
    muted = value
    Howler.mute(value)
    writeMutedToStorage(value)
  }

  function isMuted(): boolean {
    return muted
  }

  function cue(name: CueName): void {
    let howl = cues.get(name)
    if (howl == null) {
      howl = makeCue(name)
      cues.set(name, howl)
    }
    try {
      howl.play()
    } catch {
      /* silent no-op — missing file or autoplay block */
    }
  }

  function getAnalyser(): AnalyserNode {
    if (analyser != null) return analyser

    const ctx = Howler.ctx
    const node = ctx.createAnalyser()
    node.fftSize = 256
    node.smoothingTimeConstant = 0.85

    // Tap off the master gain WITHOUT connecting the analyser to the
    // destination — this keeps it out of the audio signal path.
    try {
      Howler.masterGain.connect(node)
    } catch (err) {
      console.warn('[audio] failed to attach analyser tap', err)
    }

    analyser = node
    return node
  }

  function dispose(): void {
    for (const howl of tracks.values()) {
      try {
        howl.stop()
        howl.unload()
      } catch {
        /* ignore */
      }
    }
    tracks.clear()

    for (const howl of cues.values()) {
      try {
        howl.stop()
        howl.unload()
      } catch {
        /* ignore */
      }
    }
    cues.clear()

    if (analyser != null) {
      try {
        Howler.masterGain.disconnect(analyser)
      } catch {
        /* already disconnected */
      }
      analyser = null
    }

    started = false
    currentTrack = null
  }

  return {
    begin,
    to,
    setMuted,
    isMuted,
    cue,
    getAnalyser,
    dispose,
  }
}
