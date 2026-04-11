/**
 * lamp.ts — Easter egg: click the desk lamp to toggle it on/off. Tweens
 * the deskLamp light intensity and the shade's emissive glow. Owned by W11.
 */

import gsap from 'gsap'
import { Mesh, MeshStandardMaterial } from 'three'
import type { Room, RoomLights, AudioController } from '../contracts'

export interface LampDeps {
  room: Room
  lights: RoomLights
  audio: AudioController
}

const DEFAULT_INTENSITY = 8
const DEFAULT_EMISSIVE = 0.35

/**
 * Factory returning a handler closure so we can keep `lampOn` state across
 * clicks. Consumers should create this once and re-use it.
 */
export function createLampHandler(
  deps: LampDeps,
): (override?: LampDeps) => Promise<void> {
  let lampOn = true

  // Find the shade mesh inside the lamp group (its material is emissive).
  const findShade = (): MeshStandardMaterial | null => {
    let found: MeshStandardMaterial | null = null
    deps.room.props.lamp.traverse((obj) => {
      if (found) return
      const mesh = obj as Mesh
      const mat = mesh.material as MeshStandardMaterial | undefined
      if (mat && mat.emissive && mat.emissiveIntensity !== undefined && mat.emissiveIntensity > 0) {
        found = mat
      }
    })
    return found
  }

  const shadeMat = findShade()

  return async (): Promise<void> => {
    deps.audio.cue('lamp-click')

    if (lampOn) {
      lampOn = false
      await new Promise<void>((resolve) => {
        const tl = gsap.timeline({ onComplete: resolve })
        tl.to(deps.lights.deskLamp, { intensity: 0, duration: 0.3, ease: 'power2.out' }, 0)
        if (shadeMat) {
          tl.to(shadeMat, { emissiveIntensity: 0, duration: 0.3, ease: 'power2.out' }, 0)
        }
      })
    } else {
      lampOn = true
      await new Promise<void>((resolve) => {
        const tl = gsap.timeline({ onComplete: resolve })
        tl.to(deps.lights.deskLamp, { intensity: DEFAULT_INTENSITY, duration: 0.3, ease: 'power2.in' }, 0)
        if (shadeMat) {
          tl.to(shadeMat, { emissiveIntensity: DEFAULT_EMISSIVE, duration: 0.3, ease: 'power2.in' }, 0)
        }
      })
    }
  }
}
