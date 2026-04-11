/**
 * strawHat.ts — Easter egg: click the straw hat on the wall and it flips
 * across the room to land on the avatar's head briefly, then zips back to
 * the wall hook. Owned by W11.
 */

import gsap from 'gsap'
import { Vector3 } from 'three'
import type { Avatar, AudioController, Room } from '../contracts'

export interface StrawHatDeps {
  room: Room
  avatar: Avatar
  audio: AudioController
}

/**
 * Fly the straw hat to the avatar's head and back. Resolves when the hat
 * has fully returned to its original wall position.
 */
export async function onStrawHatClick(deps: StrawHatDeps): Promise<void> {
  const hat = deps.room.props.strawHat
  const origPos = hat.position.clone()
  const origRot = { x: hat.rotation.x, y: hat.rotation.y, z: hat.rotation.z }

  deps.audio.cue('hat-sting')

  // Target: the avatar's head world position (approximate via root + 1.88y).
  const headTarget = new Vector3()
  deps.avatar.root.getWorldPosition(headTarget)
  headTarget.y += 1.88
  // Convert into the hat's parent local space.
  const parent = hat.parent
  if (parent) {
    parent.worldToLocal(headTarget)
  }

  await new Promise<void>((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve })
    tl.to(hat.position, {
      x: headTarget.x,
      y: headTarget.y,
      z: headTarget.z,
      duration: 0.6,
      ease: 'power2.out',
    }, 0)
    tl.to(hat.rotation, {
      x: 0,
      y: 0,
      z: origRot.z + Math.PI,
      duration: 0.6,
      ease: 'power2.out',
    }, 0)
    // settle briefly
    tl.to({}, { duration: 2 })
    // return to wall
    tl.to(hat.position, {
      x: origPos.x,
      y: origPos.y,
      z: origPos.z,
      duration: 0.5,
      ease: 'power2.inOut',
    })
    tl.to(hat.rotation, {
      x: origRot.x,
      y: origRot.y,
      z: origRot.z,
      duration: 0.5,
      ease: 'power2.inOut',
    }, '<')
  })
}
