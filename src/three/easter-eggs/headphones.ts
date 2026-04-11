/**
 * headphones.ts — Easter egg: click the headphones and they fly onto the
 * avatar's head. While worn, the world audio is muffled for 3 seconds.
 * Owned by W11.
 */

import gsap from 'gsap'
import { Vector3 } from 'three'
import type { Avatar, AudioController, Room } from '../contracts'

export interface HeadphonesDeps {
  room: Room
  avatar: Avatar
  audio: AudioController
}

/**
 * Move the headphones to the avatar's head, muffle audio, then return.
 */
export async function onHeadphonesClick(deps: HeadphonesDeps): Promise<void> {
  const phones = deps.room.props.headphones
  const origPos = phones.position.clone()
  const origRot = { x: phones.rotation.x, y: phones.rotation.y, z: phones.rotation.z }

  const headTarget = new Vector3()
  deps.avatar.root.getWorldPosition(headTarget)
  headTarget.y += 1.88
  const parent = phones.parent
  if (parent) {
    parent.worldToLocal(headTarget)
  }

  deps.audio.cue('click')

  await new Promise<void>((resolve) => {
    gsap.to(phones.position, {
      x: headTarget.x,
      y: headTarget.y,
      z: headTarget.z,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: resolve,
    })
  })

  // Muffle: simplest path — mute for 3s (AudioController exposes setMuted).
  const wasMuted = deps.audio.isMuted()
  if (!wasMuted) {
    deps.audio.setMuted(true)
  }

  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 3000)
  })

  if (!wasMuted) {
    deps.audio.setMuted(false)
  }

  await new Promise<void>((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve })
    tl.to(phones.position, {
      x: origPos.x,
      y: origPos.y,
      z: origPos.z,
      duration: 0.5,
      ease: 'power2.inOut',
    }, 0)
    tl.to(phones.rotation, {
      x: origRot.x,
      y: origRot.y,
      z: origRot.z,
      duration: 0.5,
      ease: 'power2.inOut',
    }, 0)
  })
}
