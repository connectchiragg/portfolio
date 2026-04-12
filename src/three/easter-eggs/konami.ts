/**
 * konami.ts — Easter egg: listens for the classic Konami code sequence
 * (↑ ↑ ↓ ↓ ← → ← → B A). On match, plays the avatar's celebration pose.
 */

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

export function setupKonami(deps: KonamiDeps): { dispose: () => void } {
  let idx = 0
  let triggered = false

  const trigger = (): void => {
    if (triggered) return
    triggered = true
    deps.avatar.play('celebration')
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
