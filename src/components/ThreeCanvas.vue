<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { createScene } from '../three/Scene'
import { createLoader } from '../three/Loader'
import { createRoomLights } from '../three/lights'
import { loadRoom } from '../three/room/Room'
import { loadAvatar } from '../three/characters/Avatar'
import { createHologram } from '../three/characters/Hologram'
import { buildMailroom, disposeMailroom } from '../three/room/Mailroom'
import { createScroll } from '../scroll/lenis'
import { createTimeline } from '../scroll/timeline'
import { createComposer } from '../three/effects/composer'
import { createGodRays } from '../three/effects/godRays'
import { mountCustomCursor } from '../three/effects/customCursor'
import { createSakuraField } from '../three/effects/sakuraField'
import { createAudio } from '../audio/sounds'
import { mountEasterEggs } from '../three/easter-eggs'
import { mountMouseParallax } from '../utils/parallax'
import { detectGpuTier } from '../utils/gpu'
import { prefersReducedMotion } from '../utils/prefersReducedMotion'
import type {
  SceneContext,
  RoomLights,
  Loader,
  Room,
  Avatar,
  Hologram,
  ScrollContext,
  MasterTimeline,
  Composer,
  AudioController,
} from '../three/contracts'
import type { Group, Object3D } from 'three'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const ctx = shallowRef<SceneContext | null>(null)
const lights = shallowRef<RoomLights | null>(null)
const loader = shallowRef<Loader | null>(null)
const room = shallowRef<Room | null>(null)
const avatar = shallowRef<Avatar | null>(null)
const hologramAvatar = shallowRef<Avatar | null>(null)
const hologram = shallowRef<Hologram | null>(null)
const mailroom = shallowRef<Group | null>(null)
const scroll = shallowRef<ScrollContext | null>(null)
const timeline = shallowRef<MasterTimeline | null>(null)
const composer = shallowRef<Composer | null>(null)
const audio = shallowRef<AudioController | null>(null)
const sakura = shallowRef<{ object: Object3D; tick: (dt: number) => void; dispose: () => void } | null>(null)
const godRays = shallowRef<{ object: Object3D; dispose: () => void } | null>(null)
const cursor = shallowRef<{ dispose: () => void } | null>(null)
const easterEggs = shallowRef<{ dispose: () => void } | null>(null)
const parallax = shallowRef<{ tick: (dt: number) => void; dispose: () => void } | null>(null)

onMounted(async () => {
  if (!canvasRef.value) return

  const scene = createScene({ canvas: canvasRef.value })
  ctx.value = scene

  const roomLights = createRoomLights()
  roomLights.attach(scene.scene)
  lights.value = roomLights

  const ldr = createLoader(scene.renderer)
  loader.value = ldr

  // Two avatars: one is the "real" body that lives in the room and teleports
  // between the chair (hero) and the mailroom (contact); the other is owned
  // by the hologram and never moves.
  const [loadedRoom, loadedAvatar, holoAvatar] = await Promise.all([
    loadRoom(ldr),
    loadAvatar(ldr, '/models/character.glb'),
    loadAvatar(ldr, '/models/character.glb'),
  ])
  room.value = loadedRoom
  avatar.value = loadedAvatar
  hologramAvatar.value = holoAvatar

  // Mount the real avatar in the chair (hero scene)
  loadedAvatar.root.position.set(0, 0, -0.6)
  loadedAvatar.play('sitting')
  loadedRoom.root.add(loadedAvatar.root)
  scene.scene.add(loadedRoom.root)

  // Hologram owns its own avatar so it can re-parent + swap materials
  // without disturbing the chair-bound real avatar.
  const holo = createHologram(holoAvatar)
  holo.setReveal(0)
  holo.root.visible = false
  holo.root.position.set(0, 0, 8) // parked behind the back wall
  scene.scene.add(holo.root)
  hologram.value = holo

  // Mailroom — built but parked far away until the timeline reveals it
  const mr = buildMailroom()
  mr.position.set(0, 0, 16)
  mr.visible = false
  scene.scene.add(mr)
  mailroom.value = mr

  // ─── Phase 5: Polish layer ──────────────────────────────────────────────

  // Sakura petals — drifting near the hero window. The Group is positioned
  // around the hero scene area; the timeline can reveal/hide it later.
  const sak = createSakuraField()
  sak.object.position.set(-1.5, 1.5, -0.5)
  scene.scene.add(sak.object)
  sakura.value = sak

  // God rays — additive translucent slabs from the hero window
  const gr = createGodRays(scene.scene, scene.camera)
  scene.scene.add(gr.object)
  godRays.value = gr

  // GPU tier check — disable postprocessing on low-end devices
  const gpuInfo = await detectGpuTier()
  const reducedMotion = prefersReducedMotion()
  const enablePostFx = gpuInfo.tier >= 2 && !gpuInfo.isMobile && !reducedMotion

  // Postprocessing composer — replaces the default render call
  if (enablePostFx) {
    const cmp = createComposer(scene)
    scene.setRenderer((dt) => cmp.render(dt))
    composer.value = cmp
    // Resize composer alongside the canvas
    const ro = new ResizeObserver(() => {
      const w = canvasRef.value?.clientWidth ?? window.innerWidth
      const h = canvasRef.value?.clientHeight ?? window.innerHeight
      cmp.setSize(w, h)
    })
    if (canvasRef.value) ro.observe(canvasRef.value)
  }

  // Audio
  const aud = createAudio()
  audio.value = aud
  // Begin on first user interaction (browsers block autoplay)
  const beginAudio = (): void => {
    void aud.begin()
    // Tap the analyser into the hologram so it pulses to bass
    holo.bindAnalyser(aud.getAnalyser())
    window.removeEventListener('pointerdown', beginAudio)
    window.removeEventListener('keydown', beginAudio)
  }
  window.addEventListener('pointerdown', beginAudio, { once: true })
  window.addEventListener('keydown', beginAudio, { once: true })

  // Custom DOM cursor
  cursor.value = mountCustomCursor()

  // Mouse parallax (additive on top of the timeline's lookAt)
  const px = mountMouseParallax(scene.camera)
  parallax.value = px

  // Easter eggs
  if (canvasRef.value) {
    easterEggs.value = mountEasterEggs({
      sceneCtx: scene,
      room: loadedRoom,
      avatar: loadedAvatar,
      lights: roomLights,
      audio: aud,
      domElement: canvasRef.value,
    })
  }

  // ─── Tick wiring ────────────────────────────────────────────────────────
  scene.onTick((dt, elapsed) => {
    loadedRoom.tick?.(dt, elapsed)
    loadedAvatar.tick?.(dt, elapsed)
    holo.tick?.(dt, elapsed)
    sak.tick(dt)
    px.tick(dt)
  })

  // Scroll + master timeline (Phase 4)
  const scr = createScroll()
  scroll.value = scr
  const tl = createTimeline()
  tl.build({
    sceneCtx: scene,
    room: loadedRoom,
    avatar: loadedAvatar,
    hologram: holo,
    lights: roomLights,
    mailroom: mr,
  })
  timeline.value = tl
})

onBeforeUnmount(() => {
  easterEggs.value?.dispose()
  parallax.value?.dispose()
  cursor.value?.dispose()
  composer.value?.dispose()
  audio.value?.dispose()
  godRays.value?.dispose()
  sakura.value?.dispose()
  timeline.value?.dispose()
  scroll.value?.lenis.destroy()
  hologram.value?.dispose()
  hologramAvatar.value?.dispose()
  if (mailroom.value) disposeMailroom(mailroom.value)
  avatar.value?.dispose()
  room.value?.dispose()
  loader.value?.dispose()
  ctx.value?.dispose()

  easterEggs.value = null
  parallax.value = null
  cursor.value = null
  composer.value = null
  audio.value = null
  godRays.value = null
  sakura.value = null
  timeline.value = null
  scroll.value = null
  hologram.value = null
  hologramAvatar.value = null
  mailroom.value = null
  avatar.value = null
  room.value = null
  loader.value = null
  ctx.value = null
  lights.value = null
})
</script>

<template>
  <canvas ref="canvasRef" class="three-canvas" />
</template>
