/**
 * lights.ts — The Room light rig for "Late Night, Bengaluru". Four
 * lights (warm desk lamp, cool moonlight, golden sunrise, soft ambient)
 * with a `setTimeOfDay(t)` helper that lerps intensities from night
 * (t=0) to dawn (t=1) so the master timeline can drive it from scroll.
 */

import {
  PointLight,
  DirectionalLight,
  AmbientLight,
} from 'three'
import type { Scene } from 'three'
import type { RoomLights } from './contracts'

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

export function createRoomLights(): RoomLights {
  const deskLamp = new PointLight('#ffb86b', 8, 6, 2)
  deskLamp.position.set(0.7, 1.4, 0.4)
  deskLamp.castShadow = true
  deskLamp.shadow.mapSize.set(1024, 1024)
  deskLamp.shadow.bias = -0.0005

  const moonlight = new DirectionalLight('#7aa8ff', 0.4)
  moonlight.position.set(-4, 4, -3)
  moonlight.castShadow = true
  moonlight.shadow.camera.left = -5
  moonlight.shadow.camera.right = 5
  moonlight.shadow.camera.top = 5
  moonlight.shadow.camera.bottom = -5
  moonlight.shadow.camera.updateProjectionMatrix()

  const sunrise = new DirectionalLight('#ffb673', 0)
  sunrise.position.set(4, 3, 2)

  const ambient = new AmbientLight('#1a1a2e', 0.15)

  const attach = (scene: Scene): void => {
    scene.add(deskLamp)
    scene.add(moonlight)
    scene.add(sunrise)
    scene.add(ambient)
  }

  const setTimeOfDay = (t: number): void => {
    const k = clamp01(t)
    deskLamp.intensity = lerp(8, 1.5, k)
    moonlight.intensity = lerp(0.4, 0, k)
    sunrise.intensity = lerp(0, 1.6, k)
    ambient.intensity = lerp(0.15, 0.5, k)
  }

  return {
    deskLamp,
    moonlight,
    sunrise,
    ambient,
    attach,
    setTimeOfDay,
  }
}
