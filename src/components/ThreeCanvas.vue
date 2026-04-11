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
import type {
  SceneContext,
  RoomLights,
  Loader,
  Room,
  Avatar,
  Hologram,
  ScrollContext,
  MasterTimeline,
} from '../three/contracts'
import type { Group } from 'three'

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

onMounted(async () => {
  if (!canvasRef.value) return

  const scene = createScene({ canvas: canvasRef.value })
  ctx.value = scene

  const roomLights = createRoomLights()
  roomLights.attach(scene.scene)
  lights.value = roomLights

  const ldr = createLoader(scene.renderer)
  loader.value = ldr

  // Phase 3: load all scene content (primitives — no GLB fetches yet)
  // Two avatars: one is the "real" body that lives in the room and teleports
  // between the chair (hero) and the mailroom (contact); the other is owned
  // by the hologram and never moves. They're primitive groups, basically
  // free to instantiate twice.
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

  // Mailroom — built but parked far away until Phase 4 timeline reveals it
  const mr = buildMailroom()
  mr.position.set(0, 0, 16) // way back, out of camera until Phase 4
  mr.visible = false
  scene.scene.add(mr)
  mailroom.value = mr

  // Wire any tick callbacks the modules expose into the main loop
  scene.onTick((dt, elapsed) => {
    loadedRoom.tick?.(dt, elapsed)
    loadedAvatar.tick?.(dt, elapsed)
    holo.tick?.(dt, elapsed)
  })

  // Scroll + master timeline (W8 — Phase 4)
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
  timeline.value?.dispose()
  scroll.value?.lenis.destroy()
  hologram.value?.dispose()
  hologramAvatar.value?.dispose()
  if (mailroom.value) disposeMailroom(mailroom.value)
  avatar.value?.dispose()
  room.value?.dispose()
  loader.value?.dispose()
  ctx.value?.dispose()

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
