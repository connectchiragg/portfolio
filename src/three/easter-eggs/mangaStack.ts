/**
 * mangaStack.ts — Easter egg: click the stack of manga on the desk, the
 * top volume opens flat, hovers briefly, then snaps shut. Owned by W11.
 */

import gsap from 'gsap'
import { Object3D } from 'three'
import type { Room, AudioController } from '../contracts'

export interface MangaStackDeps {
  room: Room
  audio: AudioController
}

/**
 * Open the top manga in the stack flat for ~1.5s, then close it back.
 */
export async function onMangaStackClick(deps: MangaStackDeps): Promise<void> {
  const stack = deps.room.props.mangaStack
  // The top child is the last-added slab in Room.ts.
  const children = stack.children.filter((c): c is Object3D => c instanceof Object3D)
  if (children.length === 0) return
  const top = children[children.length - 1]

  const origRotX = top.rotation.x
  const origY = top.position.y

  deps.audio.cue('click')

  await new Promise<void>((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve })
    tl.to(top.rotation, { x: Math.PI / 2, duration: 0.4, ease: 'power2.out' }, 0)
    tl.to(top.position, { y: origY + 0.08, duration: 0.4, ease: 'power2.out' }, 0)
    tl.to({}, { duration: 1.5 })
    tl.to(top.rotation, { x: origRotX, duration: 0.4, ease: 'power2.inOut' })
    tl.to(top.position, { y: origY, duration: 0.4, ease: 'power2.inOut' }, '<')
  })
}
