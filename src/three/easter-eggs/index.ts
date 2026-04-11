/**
 * easter-eggs/index.ts — Orchestrator + registry for the hero room's
 * click-to-play easter eggs. Wires pointer → raycast → prop-specific
 * handler, plus the global Konami and idle-stretch listeners.
 *
 * The orchestrator imports this module and calls `mountEasterEggs(deps)`
 * once after all scene objects exist. It returns a `dispose()` that the
 * orchestrator should invoke on teardown.
 *
 * Owned by W11.
 */

import { Raycaster, Vector2, Object3D } from 'three'
import gsap from 'gsap'
import type {
  SceneContext,
  Room,
  RoomProps,
  Avatar,
  RoomLights,
  AudioController,
} from '../contracts'
import { onStrawHatClick } from './strawHat'
import { onFootballClick } from './football'
import { onHeadphonesClick } from './headphones'
import { onMangaStackClick } from './mangaStack'
import { createLampHandler } from './lamp'
import { onMugClick } from './mug'
import { setupKonami } from './konami'
import { setupIdleStretch } from './idleStretch'

export interface MountDeps {
  sceneCtx: SceneContext
  room: Room
  avatar: Avatar
  lights: RoomLights
  audio: AudioController
  domElement: HTMLElement
}

type PropKey = keyof RoomProps

// Props that have a click handler wired up.
const INTERACTIVE_PROPS: PropKey[] = [
  'strawHat',
  'football',
  'headphones',
  'mangaStack',
  'lamp',
  'mug',
]

/**
 * Mount every easter-egg listener. Returns a disposer that unwinds
 * pointer listeners, key listeners, rAF loops, and any pending tweens.
 */
export function mountEasterEggs(deps: MountDeps): { dispose: () => void } {
  const raycaster = new Raycaster()
  const ndc = new Vector2()

  // Track per-prop busy state so rapid clicks don't stack animations.
  const busy = new Set<PropKey>()

  const lampHandler = createLampHandler({
    room: deps.room,
    lights: deps.lights,
    audio: deps.audio,
  })

  const handlers: Partial<Record<PropKey, () => Promise<void>>> = {
    strawHat: () => onStrawHatClick({ room: deps.room, avatar: deps.avatar, audio: deps.audio }),
    football: () =>
      onFootballClick({ sceneCtx: deps.sceneCtx, room: deps.room, audio: deps.audio }),
    headphones: () =>
      onHeadphonesClick({ room: deps.room, avatar: deps.avatar, audio: deps.audio }),
    mangaStack: () => onMangaStackClick({ room: deps.room, audio: deps.audio }),
    lamp: () => lampHandler(),
    mug: () => onMugClick({ room: deps.room, audio: deps.audio }),
  }

  // Find which interactive prop (if any) owns the given hit object by
  // walking up its ancestor chain.
  const resolveProp = (hit: Object3D): PropKey | null => {
    let cur: Object3D | null = hit
    while (cur) {
      for (const key of INTERACTIVE_PROPS) {
        if (deps.room.props[key] === cur) return key
      }
      cur = cur.parent
    }
    return null
  }

  const onPointerDown = (ev: PointerEvent): void => {
    const rect = deps.domElement.getBoundingClientRect()
    ndc.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1
    ndc.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1

    raycaster.setFromCamera(ndc, deps.sceneCtx.camera)

    const targets: Object3D[] = INTERACTIVE_PROPS
      .map((k) => deps.room.props[k])
      .filter((obj): obj is Object3D => obj !== null && obj !== undefined)

    const hits = raycaster.intersectObjects(targets, true)
    if (hits.length === 0) return

    const propKey = resolveProp(hits[0].object)
    if (!propKey) return

    const handler = handlers[propKey]
    if (!handler) return
    if (busy.has(propKey)) return

    busy.add(propKey)
    handler()
      .catch(() => {
        // Swallow — we don't want a failed egg to break the canvas.
      })
      .finally(() => {
        busy.delete(propKey)
      })
  }

  deps.domElement.addEventListener('pointerdown', onPointerDown)

  const konami = setupKonami({ room: deps.room, avatar: deps.avatar })
  const idle = setupIdleStretch({ avatar: deps.avatar })

  return {
    dispose: (): void => {
      deps.domElement.removeEventListener('pointerdown', onPointerDown)
      konami.dispose()
      idle.dispose()
      // Cancel any in-flight tweens that touch room/avatar state.
      gsap.killTweensOf(deps.room.props.strawHat.position)
      gsap.killTweensOf(deps.room.props.strawHat.rotation)
      gsap.killTweensOf(deps.room.props.headphones.position)
      gsap.killTweensOf(deps.room.props.headphones.rotation)
      gsap.killTweensOf(deps.room.props.football.position)
      gsap.killTweensOf(deps.room.props.mangaStack.children)
      gsap.killTweensOf(deps.lights.deskLamp)
    },
  }
}
