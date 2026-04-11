/**
 * godRays.ts — Cheap "volumetric" god rays for the hero room window.
 *
 * Instead of a real volumetric scattering pass (too expensive on mobile),
 * this stacks a handful of stretched, additively blended translucent
 * quads angled from the back-left window down toward the floor. The net
 * effect from the hero camera is a soft, painterly shaft of moonlight
 * cutting across the desk.
 */

import {
  AdditiveBlending,
  Color,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three'
import type { Object3D, PerspectiveCamera, Scene as ThreeScene } from 'three'

interface GodRaysHandle {
  object: Object3D
  dispose: () => void
}

/**
 * Build a small group of translucent slabs approximating a shaft of
 * moonlight coming through the hero window.
 *
 * @param _scene  Scene reference (currently unused — orchestrator adds the
 *                returned object to the scene).
 * @param _camera Camera reference (reserved for future billboarding).
 */
export function createGodRays(
  _scene: ThreeScene,
  _camera: PerspectiveCamera,
): GodRaysHandle {
  void _scene
  void _camera

  const group = new Group()
  group.name = 'GodRays'

  // Window anchor (back-left of room) → floor landing point near the desk.
  const windowAnchor = { x: -2, y: 2.5, z: -1.8 }
  const floorTarget = { x: 0, y: 0, z: 1 }

  // Midpoint + direction for the slab stack.
  const midX = (windowAnchor.x + floorTarget.x) / 2
  const midY = (windowAnchor.y + floorTarget.y) / 2
  const midZ = (windowAnchor.z + floorTarget.z) / 2

  const dx = floorTarget.x - windowAnchor.x
  const dy = floorTarget.y - windowAnchor.y
  const dz = floorTarget.z - windowAnchor.z
  const length = Math.sqrt(dx * dx + dy * dy + dz * dz)

  // Angle the slabs so they point from the window toward the floor.
  // atan2(-dy, horizontal) around the X axis tilts them correctly.
  const horizontal = Math.sqrt(dx * dx + dz * dz)
  const pitch = Math.atan2(dy, horizontal) // downward negative
  const yaw = Math.atan2(dx, dz)

  const rayColor = new Color('#a8c4ff')
  const slabCount = 5
  const meshes: Mesh[] = []
  const materials: MeshBasicMaterial[] = []
  const geometries: PlaneGeometry[] = []

  for (let i = 0; i < slabCount; i++) {
    const geom = new PlaneGeometry(0.9 + i * 0.12, length * 1.05)
    geometries.push(geom)

    const mat = new MeshBasicMaterial({
      color: rayColor,
      transparent: true,
      opacity: 0.05,
      blending: AdditiveBlending,
      depthWrite: false,
    })
    materials.push(mat)

    const mesh = new Mesh(geom, mat)
    mesh.position.set(midX, midY, midZ)
    // Orient the plane along the window-to-floor axis.
    mesh.rotation.order = 'YXZ'
    mesh.rotation.y = yaw
    // PlaneGeometry points +Z out; we rotate so its long axis aligns
    // with the downward travel of the ray.
    mesh.rotation.x = -(Math.PI / 2 - pitch)
    // Fan the slabs slightly around the axis so they don't perfectly
    // overlap — gives the shaft some thickness.
    mesh.rotation.z = (i - (slabCount - 1) / 2) * 0.18
    mesh.renderOrder = 2
    group.add(mesh)
    meshes.push(mesh)
  }

  const dispose = (): void => {
    for (const mesh of meshes) {
      group.remove(mesh)
    }
    for (const g of geometries) g.dispose()
    for (const m of materials) m.dispose()
  }

  return {
    object: group,
    dispose,
  }
}
