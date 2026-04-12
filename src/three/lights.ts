/**
 * lights.ts — Cinematic noir light rig for "Late Night, Bengaluru".
 *
 * The room is dark; light is sculpted, not blanket. Three motivated
 * sources do the work:
 *   - Desk lamp (warm tungsten spot, the key)
 *   - Moonlight through the window (cool directional, the fill)
 *   - Hemisphere bounce (replaces ambient — directional sky/ground bounce)
 *
 * The about-section trio (key/rim/fill) for the hologram platform stays
 * in place for the wardrobe-reveal close-up.
 *
 * setTimeOfDay(t) lerps from night (t=0) → dawn (t=1) for the contact
 * arc and footer fade-out.
 */

import {
  PointLight,
  DirectionalLight,
  HemisphereLight,
  SpotLight,
  Object3D,
} from 'three'
import type { Scene } from 'three'
import type { RoomLights } from './contracts'

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v)

export function createRoomLights(): RoomLights {
  // ─── Key: desk lamp as SpotLight — cone of light from bulb onto desk ─────
  const deskLamp = new SpotLight('#ffb86b', 12, 6, Math.PI / 3, 0.5, 1.4)
  // Bulb tip position (lamp base at 0.50, 0.70, 0.68 + lamp is 0.45m tall)
  deskLamp.position.set(0.50, 1.10, 0.60)
  // Aim at the desk surface center
  const deskLampTarget = new Object3D()
  deskLampTarget.position.set(0.2, 0.70, 0.0)
  deskLamp.target = deskLampTarget
  deskLamp.castShadow = true
  deskLamp.shadow.mapSize.set(1024, 1024)
  deskLamp.shadow.bias = -0.0005
  deskLamp.shadow.radius = 4

  // ─── Fill: faint moonlight through the window (barely visible) ───────────
  const moonlight = new DirectionalLight('#7a9eff', 0.15)
  moonlight.position.set(-4, 4.5, -3)
  moonlight.castShadow = true
  moonlight.shadow.mapSize.set(512, 512)
  moonlight.shadow.camera.left = -5
  moonlight.shadow.camera.right = 5
  moonlight.shadow.camera.top = 5
  moonlight.shadow.camera.bottom = -5
  moonlight.shadow.camera.near = 0.5
  moonlight.shadow.camera.far = 18
  moonlight.shadow.bias = -0.0004
  moonlight.shadow.radius = 3
  moonlight.shadow.camera.updateProjectionMatrix()

  // ─── Sunrise: dormant warm directional that ramps in for contact/footer ──
  const sunrise = new DirectionalLight('#ffb673', 0)
  sunrise.position.set(4, 3, 2)

  // ─── Bounce: very dim hemisphere so shadows aren't pitch black ───────────
  const hemi = new HemisphereLight('#1f2a4a', '#0a0807', 0.06)

  // ─── Mailroom contact-section trio ───────────────────────────────────────
  // The mailroom is parked at z≈16, far from the hero room lights, and
  // the global directional sunrise hits it from behind because of the
  // (4,3,2)→(0,0,0) direction. Add a dedicated key/fill/rim that ramps
  // in only while the contact section is on screen so the cardboard
  // packages, envelopes, and standing avatar are actually legible.
  const mailroomKey = new SpotLight(
    '#ffd6a0',
    0,
    24,
    Math.PI / 4,
    0.45,
    1.2,
  )
  mailroomKey.position.set(-3.0, 4.5, 18.5)
  const mailroomKeyTarget = new Object3D()
  mailroomKeyTarget.position.set(0, 0.8, 16)
  mailroomKey.target = mailroomKeyTarget
  mailroomKey.castShadow = true
  mailroomKey.shadow.mapSize.set(1024, 1024)
  mailroomKey.shadow.bias = -0.0004
  mailroomKey.shadow.radius = 4

  const mailroomFill = new PointLight('#f3a35e', 0, 14, 1.6)
  mailroomFill.position.set(2.8, 1.8, 17.5)

  const mailroomRim = new SpotLight(
    '#ffe0b8',
    0,
    20,
    Math.PI / 5,
    0.5,
    1.4,
  )
  mailroomRim.position.set(3.8, 3.2, 14.5)
  const mailroomRimTarget = new Object3D()
  mailroomRimTarget.position.set(0, 1.2, 16.5)
  mailroomRim.target = mailroomRimTarget

  // ─── About-section trio for the hologram platform (unchanged) ────────────
  const aboutKey = new SpotLight('#ffffff', 0, 20, Math.PI / 5, 0.4, 1.0)
  aboutKey.position.set(0, 4, 5)
  const aboutKeyTarget = new Object3D()
  aboutKeyTarget.position.set(0, 1.0, 8)
  aboutKey.target = aboutKeyTarget

  const aboutRim = new SpotLight('#4ad8ff', 0, 20, Math.PI / 4, 0.6, 1.0)
  aboutRim.position.set(2, 2, 11)
  const aboutRimTarget = new Object3D()
  aboutRimTarget.position.set(0, 1.4, 8)
  aboutRim.target = aboutRimTarget

  const aboutFill = new SpotLight('#a8c4ff', 0, 20, Math.PI / 3, 0.7, 1.0)
  aboutFill.position.set(-3, 1, 6)
  const aboutFillTarget = new Object3D()
  aboutFillTarget.position.set(0, 1.4, 8)
  aboutFill.target = aboutFillTarget

  const attach = (scene: Scene): void => {
    scene.add(deskLamp)
    scene.add(deskLampTarget)
    scene.add(moonlight)
    scene.add(sunrise)
    scene.add(hemi)
    scene.add(mailroomKey)
    scene.add(mailroomKeyTarget)
    scene.add(mailroomFill)
    scene.add(mailroomRim)
    scene.add(mailroomRimTarget)
    scene.add(aboutKey)
    scene.add(aboutKeyTarget)
    scene.add(aboutRim)
    scene.add(aboutRimTarget)
    scene.add(aboutFill)
    scene.add(aboutFillTarget)
  }

  // Night → dawn arc. Tuned so the hero (t=0) is unmistakably late-night
  // (lamp + moon dominate, no warm fill) and the footer (t=1) reads as
  // first sunlight (lamp clicked off, sunrise key, hemi opens up).
  const setTimeOfDay = (t: number): void => {
    const k = clamp01(t)
    deskLamp.intensity = lerp(12, 0, k)
    moonlight.intensity = lerp(0.15, 0.05, k)
    sunrise.intensity = lerp(0, 2.0, k)
    hemi.intensity = lerp(0.06, 0.55, k)
  }

  const setAboutLightLevel = (v: number): void => {
    const k = clamp01(v)
    aboutKey.intensity = lerp(0, 6, k)
    aboutRim.intensity = lerp(0, 4, k)
    aboutFill.intensity = lerp(0, 2, k)
  }

  // Contact-section dedicated rig — only on while the camera is parked
  // in the mailroom, kept dark elsewhere so it doesn't bleed into the
  // hero/projects/about scenes.
  const setMailroomLightLevel = (v: number): void => {
    const k = clamp01(v)
    mailroomKey.intensity = lerp(0, 18, k)
    mailroomFill.intensity = lerp(0, 22, k)
    mailroomRim.intensity = lerp(0, 10, k)
  }

  return {
    deskLamp,
    moonlight,
    sunrise,
    // Legacy contract field — kept as an alias of the hemisphere so any
    // existing primitive code that pokes `.ambient.intensity` still works.
    ambient: hemi,
    attach,
    setTimeOfDay,
    setAboutLightLevel,
    setMailroomLightLevel,
  } as RoomLights & {
    setAboutLightLevel: (v: number) => void
    setMailroomLightLevel: (v: number) => void
  }
}
