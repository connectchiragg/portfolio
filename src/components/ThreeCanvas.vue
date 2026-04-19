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

const emit = defineEmits<{
  (e: 'progress', value: number): void
  (e: 'ready'): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const ctx = shallowRef<SceneContext | null>(null)
const lights = shallowRef<RoomLights | null>(null)
const loader = shallowRef<Loader | null>(null)
const room = shallowRef<Room | null>(null)
const avatar = shallowRef<Avatar | null>(null)
const hologram = shallowRef<Hologram | null>(null)
const mailroom = shallowRef<Group | null>(null)
const scroll = shallowRef<ScrollContext | null>(null)
const timeline = shallowRef<MasterTimeline | null>(null)
const composer = shallowRef<Composer | null>(null)
const audio = shallowRef<AudioController | null>(null)
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

  // ── Progress aggregator ──────────────────────────────────────────────
  // Tracks bytes loaded/total per file, emits normalized 0→1 progress.
  const fileProgress = new Map<string, { loaded: number; total: number }>()
  const onFileProgress = (e: ProgressEvent) => {
    const url = (e.target as XMLHttpRequest | undefined)?.responseURL ?? ''
    fileProgress.set(url, { loaded: e.loaded, total: e.total || e.loaded })
    let loaded = 0, total = 0
    for (const v of fileProgress.values()) {
      loaded += v.loaded
      total += v.total
    }
    emit('progress', total > 0 ? Math.min(loaded / total, 1) : 0)
  }

  // Phase 7C: a SINGLE avatar instance, parented directly to the scene so
  // the timeline state machine can teleport it freely between the chair
  // (hero), the hologram platform (about), the room standing position
  // (projects) and the mailroom (contact). The hologram applies its shader
  // material in-place via setReveal(>0) and restores on setReveal(0).
  const [loadedRoom, loadedAvatar] = await Promise.all([
    loadRoom(ldr, onFileProgress),
    loadAvatar(ldr, '/models/character.glb', onFileProgress),
  ])
  room.value = loadedRoom
  avatar.value = loadedAvatar

  loadedRoom.root.visible = false
  scene.scene.add(loadedRoom.root)
  requestAnimationFrame(() => {
    loadedRoom.root.visible = true
  })

  // Mount the avatar at the chair position (hero scene). Parent to the
  // scene root, NOT room.root, so room.root.visible toggles don't drag the
  // avatar with them.
  loadedAvatar.root.position.set(0.55, 0, -1.2)
  loadedAvatar.play('sitting')
  // Hide until the mixer has ticked and applied the pose (avoids T-pose flash).
  // Force a mixer update at dt=0 to snap to the first frame immediately.
  loadedAvatar.root.visible = false
  scene.scene.add(loadedAvatar.root)
  if (loadedAvatar.tick) loadedAvatar.tick(0, 0)
  // Wait a few frames for the GPU to process the skinned mesh update
  let showCountdown = 3
  const showCheck = () => {
    if (--showCountdown <= 0) {
      loadedAvatar.root.visible = true
    } else {
      requestAnimationFrame(showCheck)
    }
  }
  requestAnimationFrame(showCheck)

  // Hologram FX layer — platform + grid only, no avatar inside. Material
  // swap on the avatar happens in-place via the setReveal API.
  const holo = createHologram(loadedAvatar)
  holo.root.position.set(0, 0, 8) // parked behind the back wall
  scene.scene.add(holo.root)

  // Pre-warm hologram shaders: render one frame with reveal=1 so the GPU
  // compiles the grid, platform, and laser ring shaders *before* the user
  // scrolls to #about. Without this the first visible frame stalls for
  // 50-200ms while the GPU compiles 3+ custom ShaderMaterials, causing
  // the infamous "snap" on the first scroll after reload.
  holo.setReveal(1)
  holo.root.visible = true
  scene.renderer.render(scene.scene, scene.camera)
  // Now hide and reset — shaders are compiled, next reveal is instant.
  holo.setReveal(0)
  holo.root.visible = false
  hologram.value = holo





  // Mailroom — starts below camera, lifts into view with scroll (elevator).
  // Avatar is parented inside the mailroom group so everything moves as one.
  const mr = buildMailroom()
  mr.position.set(0, -6, 0)
  mr.visible = false
  scene.scene.add(mr)
  mailroom.value = mr

  // Parent mailroom lights inside the mailroom group so they ride the elevator
  const lightsExt = roomLights as typeof roomLights & { mailroomLights?: import('three').Object3D[] }
  if (lightsExt.mailroomLights) {
    for (const l of lightsExt.mailroomLights) mr.add(l)
  }

  // ─── Phase 5: Polish layer ──────────────────────────────────────────────
  // Sakura petals were removed in Phase 7C+ per visual feedback (the
  // floating dots looked like noise, not atmosphere). Keep createSakuraField
  // available for a future re-enable if/when we have a sakura sprite.

  // God rays — additive translucent slabs from the hero window.
  // Parent under room.root so they auto-hide when the room is hidden
  // (about/contact sections), avoiding wasted fragment shading.
  const gr = createGodRays(scene.scene, scene.camera)
  loadedRoom.root.add(gr.object)
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

  // Audio is handled by App.vue via src/audio/sounds.ts

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
      audio: null as unknown as AudioController,
      domElement: canvasRef.value,
    })
  }

  // ─── Tick wiring ────────────────────────────────────────────────────────
  scene.onTick((dt, elapsed) => {
    loadedRoom.tick?.(dt, elapsed)
    loadedAvatar.tick?.(dt, elapsed)
    holo.tick?.(dt, elapsed)
    px.tick(dt)
    const mailroomTick = (mr.userData?.tick as ((dt: number) => void) | undefined)
    mailroomTick?.(dt)
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

  // Show canvas only after everything is initialized
  emit('progress', 1)
  requestAnimationFrame(() => {
    ready.value = true
    emit('ready')
  })
})

onBeforeUnmount(() => {
  easterEggs.value?.dispose()
  parallax.value?.dispose()
  cursor.value?.dispose()
  composer.value?.dispose()
  audio.value?.dispose()
  godRays.value?.dispose()
  timeline.value?.dispose()
  scroll.value?.lenis.destroy()
  hologram.value?.dispose()
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
  timeline.value = null
  scroll.value = null
  hologram.value = null
  mailroom.value = null
  avatar.value = null
  room.value = null
  loader.value = null
  ctx.value = null
  lights.value = null
})
</script>

<template>
  <canvas ref="canvasRef" class="three-canvas" :style="{ opacity: ready ? 1 : 0, transition: 'opacity 1.2s ease-in' }" />
</template>
