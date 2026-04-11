/**
 * CONTRACTS — Shared module shapes for parallel agent work.
 *
 * These declarations define the public interface of every shared
 * Three.js / scroll / audio module. Workers may IMPLEMENT these
 * interfaces in their own files, but they MUST NOT change the
 * signatures here without coordinating with the orchestrator.
 *
 * If a worker needs to extend a shape, ask the orchestrator to
 * update the contract first, then re-fan out.
 */

import type {
  Scene as ThreeScene,
  WebGLRenderer,
  PerspectiveCamera,
  Object3D,
  AnimationMixer,
  Group,
  Light,
} from 'three'

// ─── Core renderer / scene ────────────────────────────────────────────────

export interface SceneContext {
  renderer: WebGLRenderer
  scene: ThreeScene
  camera: PerspectiveCamera
  /** Called every frame (after `renderer.setAnimationLoop`) */
  onTick: (cb: (dt: number, elapsed: number) => void) => () => void
  /** Triggers a one-shot resize (also auto-attached to ResizeObserver) */
  resize: () => void
  /** Fully tears down the renderer + disposes geometries/materials */
  dispose: () => void
  /**
   * Replaces the default `renderer.render(scene, camera)` call inside the
   * animation loop. Used by the postprocessing composer to take over
   * rendering. Pass a no-op `() => {}` to disable rendering entirely.
   */
  setRenderer: (fn: (dt: number) => void) => void
}

export interface SceneOptions {
  canvas: HTMLCanvasElement
  antialias?: boolean
  pixelRatio?: number
}

/** Owned by W1: src/three/Scene.ts */
export declare function createScene(opts: SceneOptions): SceneContext

// ─── Loader (GLTF + DRACO + KTX2) ─────────────────────────────────────────

export interface LoadResult {
  scene: Group
  animations: import('three').AnimationClip[]
}

export interface Loader {
  /** Loads a `.glb` from /public/models, returns root group + animations */
  load: (url: string) => Promise<LoadResult>
  /** Tear-down */
  dispose: () => void
}

/** Owned by W1: src/three/Loader.ts */
export declare function createLoader(renderer: WebGLRenderer): Loader

// ─── Lights ───────────────────────────────────────────────────────────────

export interface RoomLights {
  /** Warm desk lamp — primary key in hero */
  deskLamp: Light
  /** Cool moonlight from the window */
  moonlight: Light
  /** Golden sunrise key for the contact section */
  sunrise: Light
  /** Soft fill */
  ambient: Light
  /** Adds them all to the scene */
  attach: (scene: ThreeScene) => void
  /** Animates intensity for time-of-day transitions (0..1 = night..day) */
  setTimeOfDay: (t: number) => void
}

/** Owned by W1: src/three/lights.ts */
export declare function createRoomLights(): RoomLights

// ─── Avatar ───────────────────────────────────────────────────────────────

export type AvatarPose = 'sitting' | 'standing' | 'celebration' | 'stretch'

export interface Avatar {
  root: Object3D
  mixer: AnimationMixer
  /** Switch between Mixamo clips */
  play: (pose: AvatarPose) => void
  /** Aim the head (and eyes) at a target world position */
  lookAt: (worldX: number, worldY: number, worldZ: number) => void
  /** Re-textures the body to the Argentina #10 jersey (stripes + label) */
  applyJersey: () => void
  /**
   * Drives the wardrobe-reveal hologram scan effect.
   * 0 = pure t-shirt (default state in hero/projects/contact)
   * 1 = pure Argentina jersey
   * 0..1 = scan in progress; the scan threshold animates from above-head down
   *        to below-feet and a bright cyan band glows at the threshold
   */
  setScanReveal?: (v: number) => void
  /** Optional per-frame update — orchestrator wires this into sceneCtx.onTick */
  tick?: (dt: number, elapsed: number) => void
  dispose: () => void
}

/** Owned by W7: src/three/characters/Avatar.ts */
export declare function loadAvatar(loader: Loader, glbUrl: string): Promise<Avatar>

// ─── Hologram ─────────────────────────────────────────────────────────────

export interface Hologram {
  root: Object3D
  /** Attach an Audio AnalyserNode so the hologram pulses to bass */
  bindAnalyser: (analyser: AnalyserNode) => void
  /** 0..1 reveal (hidden → fully on) — driven by the GSAP timeline */
  setReveal: (v: number) => void
  /** Optional per-frame update — orchestrator wires this into sceneCtx.onTick */
  tick?: (dt: number, elapsed: number) => void
  dispose: () => void
}

/** Owned by W6: src/three/characters/Hologram.ts */
export declare function createHologram(avatar: Avatar): Hologram

// ─── Room ─────────────────────────────────────────────────────────────────

export interface RoomProps {
  desk: Object3D
  laptop: Object3D
  chair: Object3D
  mug: Object3D
  headphones: Object3D
  lamp: Object3D
  football: Object3D
  strawHat: Object3D
  mangaStack: Object3D
  crtTv: Object3D
  succulent: Object3D
  corkboard: Object3D
}

export interface Room {
  root: Object3D
  props: RoomProps
  /** Returns a named clickable hit-mesh by prop name (for easter eggs) */
  getHitMesh: (name: keyof RoomProps) => Object3D | null
  /** Optional per-frame update — orchestrator wires this into sceneCtx.onTick */
  tick?: (dt: number, elapsed: number) => void
  dispose: () => void
}

/** Owned by W5: src/three/room/Room.ts */
export declare function loadRoom(loader: Loader): Promise<Room>

// ─── Postprocessing composer ──────────────────────────────────────────────

export interface Composer {
  /** Drop-in replacement for `renderer.render(scene, camera)` */
  render: (dt: number) => void
  setSize: (w: number, h: number) => void
  /** Toggles individual passes for low-GPU fallback */
  setPasses: (opts: {
    bloom?: boolean
    grain?: boolean
    vignette?: boolean
    chromaticAberration?: number // 0..1
  }) => void
  dispose: () => void
}

/** Owned by W9: src/three/effects/composer.ts */
export declare function createComposer(ctx: SceneContext): Composer

// ─── Audio ────────────────────────────────────────────────────────────────

export type AudioTrack = 'jazz-warm' | 'jazz-cool'

export interface AudioController {
  /** Start the ambient bed (must be called after first user gesture) */
  begin: () => Promise<void>
  /** Cross-fade to a different track */
  to: (track: AudioTrack, durationMs?: number) => void
  /** Mute / unmute (persists to localStorage) */
  setMuted: (muted: boolean) => void
  isMuted: () => boolean
  /** Plays a one-shot UI sound */
  cue: (name: 'click' | 'hat-sting' | 'ball-thud' | 'lamp-click') => void
  /** Returns an AnalyserNode tap into the master output for the hologram pulse */
  getAnalyser: () => AnalyserNode
  dispose: () => void
}

/** Owned by W10: src/audio/sounds.ts */
export declare function createAudio(): AudioController

// ─── Scroll / timeline ────────────────────────────────────────────────────

export interface ScrollContext {
  /** Lenis instance, exposed so other modules can subscribe */
  lenis: import('lenis').default
  /** Current scroll progress 0..1 across the whole document */
  progress: () => number
  /** Adds a tick callback synced to Lenis (do NOT use requestAnimationFrame elsewhere) */
  onTick: (cb: () => void) => () => void
}

/** Owned by W3: src/scroll/lenis.ts */
export declare function createScroll(): ScrollContext

export interface MasterTimeline {
  /** Builds the GSAP master timeline. Call once after all scene objects exist. */
  build: (deps: {
    sceneCtx: SceneContext
    room: Room
    avatar: Avatar
    hologram: Hologram
    lights: RoomLights
    /**
     * Mailroom Group — built by `buildMailroom()` in
     * `src/three/room/Mailroom.ts`. The timeline parks it far back until the
     * contact section reveals it. Added in Phase 4 by W8 (see phase log).
     */
    mailroom: Group
  }) => void
  /** Tears down all ScrollTriggers */
  dispose: () => void
}

/** Owned by W8: src/scroll/timeline.ts */
export declare function createTimeline(): MasterTimeline
