/**
 * konami.ts — Easter egg: listens for the classic Konami code sequence
 * (↑ ↑ ↓ ↓ ← → ← → B A). On match, plays the avatar's celebration pose
 * and permanently glues the straw hat to the avatar's head for the rest
 * of the session. Owned by W11.
 */

import gsap from 'gsap'
import { Vector3 } from 'three'
import type { Avatar, Room } from '../contracts'

export interface KonamiDeps {
  room: Room
  avatar: Avatar
}

const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
]

/**
 * Binds a global keydown listener tracking the Konami sequence. Returns a
 * disposer which removes the listener.
 */
export function setupKonami(deps: KonamiDeps): { dispose: () => void } {
  let idx = 0
  let triggered = false

  const trigger = (): void => {
    if (triggered) return
    triggered = true

    deps.avatar.play('celebration')

    // Permanently move the straw hat onto the avatar's head.
    const hat = deps.room.props.strawHat
    const headTarget = new Vector3()
    deps.avatar.root.getWorldPosition(headTarget)
    headTarget.y += 1.88
    const parent = hat.parent
    if (parent) {
      parent.worldToLocal(headTarget)
    }
    gsap.to(hat.position, {
      x: headTarget.x,
      y: headTarget.y,
      z: headTarget.z,
      duration: 0.8,
      ease: 'power2.out',
    })
    gsap.to(hat.rotation, {
      x: 0,
      y: 0,
      z: 0,
      duration: 0.8,
      ease: 'power2.out',
    })
  }

  const onKey = (e: KeyboardEvent): void => {
    const expected = SEQUENCE[idx]
    if (e.code === expected) {
      idx++
      if (idx === SEQUENCE.length) {
        trigger()
        idx = 0
      }
    } else {
      // allow partial restart if the user re-hits the first key
      idx = e.code === SEQUENCE[0] ? 1 : 0
    }
  }

  window.addEventListener('keydown', onKey)

  return {
    dispose: (): void => {
      window.removeEventListener('keydown', onKey)
    },
  }
}
