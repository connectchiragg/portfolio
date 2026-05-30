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

const waitForFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })

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
  let highWater = 0
  const onFileProgress = (e: ProgressEvent) => {
    const url = (e.target as XMLHttpRequest | undefined)?.responseURL ?? ''
    if (e.lengthComputable && e.total > 0) {
      fileProgress.set(url, { loaded: e.loaded, total: e.total })
    } else {
      // Server didn't send Content-Length — keep the bar moving but never "complete"
      fileProgress.set(url, { loaded: e.loaded, total: e.loaded + 1 })
    }
    let loaded = 0, total = 0
    for (const v of fileProgress.values()) {
      loaded += v.loaded
      total += v.total
    }
    // Cap file-based progress at 95% — reserve the last 5% for post-load setup
    const p = total > 0 ? Math.min(loaded / total, 0.95) : 0
    // Never go backwards — new files joining the pool can temporarily drop the ratio
    if (p > highWater) highWater = p
    emit('progress', highWater)
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
  let activeComposer: Composer | null = null
  if (enablePostFx) {
    const cmp = createComposer(scene)
    scene.setRenderer((dt) => cmp.render(dt))
    composer.value = cmp
    activeComposer = cmp
    // Resize composer alongside the canvas
    const ro = new ResizeObserver(() => {
      const w = canvasRef.value?.clientWidth ?? window.innerWidth
      const h = canvasRef.value?.clientHeight ?? window.innerHeight
      cmp.setSize(w, h)
    })
    if (canvasRef.value) ro.observe(canvasRef.value)
  }

  // Compile and upload the expensive one-shot paths while the canvas is
  // still hidden behind the loading screen. The stutter this guards against
  // appears only once after reload, which points to first-use GPU work:
  // shader compilation, texture upload, postprocessing passes, and shadow
  // map allocation for previously hidden section objects.
  const renderWarmupFrame = async () => {
    scene.renderer.compile(scene.scene, scene.camera)
    if (activeComposer) activeComposer.render(1 / 60)
    else scene.renderer.render(scene.scene, scene.camera)
    await waitForFrame()
  }

  const warmupFirstUsePaths = async () => {
    const cameraPosition = scene.camera.position.clone()
    const cameraQuaternion = scene.camera.quaternion.clone()

    scene.scene.add(loadedAvatar.root)
    loadedAvatar.root.visible = true
    loadedAvatar.setHeroThinking?.(false)
    loadedAvatar.setShowContact?.(false)

    // About / laser room: compile the scan duo, platform, grid, laser ring,
    // and the composer effects that render them.
    loadedRoom.root.visible = false
    holo.root.visible = true
    holo.root.position.set(0, 0, 8)
    loadedAvatar.root.position.set(0, 0.15, 8)
    loadedAvatar.root.rotation.set(0, Math.PI, 0)
    scene.camera.position.set(0, 2.0, 4.0)
    scene.camera.lookAt(0, 1.2, 8)
    for (const reveal of [0, 0.5, 1]) {
      holo.setReveal(reveal)
      holo.setLaserProgress?.(reveal)
      loadedAvatar.tick?.(0, reveal)
      await renderWarmupFrame()
    }

    // Contact / mailroom: compile contact avatar materials, ball, mailroom
    // materials, instancing buffers, postprocessing, and shadow maps from
    // the mailroom key before the user scrolls into the section.
    holo.root.visible = false
    holo.setReveal(0)
    loadedAvatar.setHeroThinking?.(false)
    loadedAvatar.setShowContact?.(true)
    mr.add(loadedAvatar.root)
    loadedAvatar.root.visible = true
    loadedAvatar.root.position.set(0.55, 0, 0)
    loadedAvatar.root.rotation.set(0, -0.42, 0)
    loadedAvatar.tick?.(0, 0)
    mr.visible = true
    mr.position.set(0, 0, 0)
    roomLights.setTimeOfDay(0.85)
    roomLights.setMailroomLightLevel?.(1)
    scene.camera.position.set(0, 1.6, 3.5)
    scene.camera.lookAt(0, 1.2, 0)
    await renderWarmupFrame()
    await renderWarmupFrame()

    // Restore the startup state before ScrollTrigger builds the canonical
    // hero timeline state and before the canvas fades in.
    scene.camera.position.copy(cameraPosition)
    scene.camera.quaternion.copy(cameraQuaternion)
    scene.scene.add(loadedAvatar.root)
    loadedAvatar.root.visible = false
    loadedAvatar.root.position.set(0.55, 0, -1.2)
    loadedAvatar.root.rotation.set(0, 0, 0)
    loadedAvatar.setShowContact?.(false)
    loadedAvatar.setHeroThinking?.(true)
    holo.setReveal(0)
    holo.setLaserProgress?.(0)
    holo.root.visible = false
    mr.visible = false
    mr.position.set(0, -6, 0)
    loadedRoom.root.visible = true
    loadedRoom.root.position.y = 0
    roomLights.setMailroomLightLevel?.(0)
    roomLights.setTimeOfDay(0)
  }

  await warmupFirstUsePaths()

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

  const debugPerf = new URLSearchParams(window.location.search).has('debugPerf')
  const debugSectionIds = ['about', 'projects', 'contact']
  let lastPerfLogAt = 0
  const getDebugSection = () => {
    for (const id of debugSectionIds) {
      const el = document.getElementById(id)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (rect.top <= window.innerHeight * 0.55 && rect.bottom >= window.innerHeight * 0.35) {
        return id
      }
    }
    return 'hero'
  }

  // ─── Tick wiring ────────────────────────────────────────────────────────
  scene.onTick((dt, elapsed) => {
    if (debugPerf && dt > 0.05 && elapsed - lastPerfLogAt > 0.25) {
      lastPerfLogAt = elapsed
      console.warn('[perf] long frame', {
        ms: Math.round(dt * 1000),
        elapsed: Number(elapsed.toFixed(2)),
        section: getDebugSection(),
        scrollY: Math.round(window.scrollY),
        hologramVisible: holo.root.visible,
        mailroomVisible: mr.visible,
        roomVisible: loadedRoom.root.visible,
        avatarVisible: loadedAvatar.root.visible,
        renderer: scene.renderer.info.render,
        memory: scene.renderer.info.memory,
      })
    }
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
