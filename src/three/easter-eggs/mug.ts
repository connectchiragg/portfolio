/**
 * mug.ts — Easter egg: click the mug to puff up the steam cone briefly.
 * Owned by W11.
 */

import gsap from 'gsap'
import { Mesh, ConeGeometry, MeshBasicMaterial } from 'three'
import type { Room, AudioController } from '../contracts'

export interface MugDeps {
  room: Room
  audio: AudioController
}

/**
 * Puff the mug's steam cone up (scale + opacity) then settle back.
 */
export async function onMugClick(deps: MugDeps): Promise<void> {
  // Find the steam child — a cone mesh with a basic, transparent material.
  let steam: Mesh | null = null
  deps.room.props.mug.traverse((obj) => {
    if (steam) return
    const mesh = obj as Mesh
    if (mesh.isMesh && mesh.geometry instanceof ConeGeometry) {
      steam = mesh
    }
  })
  if (!steam) return
  const steamMesh = steam as Mesh

  deps.audio.cue('click')

  const mat = steamMesh.material as MeshBasicMaterial
  const origScale = steamMesh.scale.clone()
  const origOpacity = mat.opacity

  await new Promise<void>((resolve) => {
    const tl = gsap.timeline({ onComplete: resolve })
    tl.to(steamMesh.scale, { x: 1.5, y: 1.5, z: 1.5, duration: 0.5, ease: 'power2.out' }, 0)
    tl.to(mat, { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0)
    tl.to(steamMesh.scale, {
      x: origScale.x,
      y: origScale.y,
      z: origScale.z,
      duration: 1,
      ease: 'power2.inOut',
    })
    tl.to(mat, { opacity: origOpacity, duration: 1, ease: 'power2.inOut' }, '<')
  })
}
