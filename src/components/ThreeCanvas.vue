<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { createScene } from '../three/Scene'
import { createLoader } from '../three/Loader'
import { createRoomLights } from '../three/lights'
import { loadRoom } from '../three/room/Room'
import { loadAvatar } from '../three/characters/Avatar'
import { createHologram } from '../three/characters/Hologram'
import { buildMailroom, disposeMailroom } from '../three/room/Mailroom'
import type {
  SceneContext,
  RoomLights,
  Loader,
  Room,
  Avatar,
  Hologram,
} from '../three/contracts'
import type { Group } from 'three'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const ctx = shallowRef<SceneContext | null>(null)
const lights = shallowRef<RoomLights | null>(null)
const loader = shallowRef<Loader | null>(null)
const room = shallowRef<Room | null>(null)
const avatar = shallowRef<Avatar | null>(null)
const hologram = shallowRef<Hologram | null>(null)
const mailroom = shallowRef<Group | null>(null)

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
  const [loadedRoom, loadedAvatar] = await Promise.all([
    loadRoom(ldr),
    loadAvatar(ldr, '/models/character.glb'),
  ])
  room.value = loadedRoom
  avatar.value = loadedAvatar

  // Mount the avatar in the chair (hero scene)
  loadedAvatar.root.position.set(0, 0, -0.6)
  loadedAvatar.play('sitting')
  loadedRoom.root.add(loadedAvatar.root)
  scene.scene.add(loadedRoom.root)

  // Hologram wraps the same avatar — Phase 4 timeline will toggle visibility
  // between the room avatar and the hologram avatar. For now, build the
  // hologram on a clone-friendly stub: pass the same avatar root and let the
  // material swap happen at reveal time. To avoid material conflicts in
  // Phase 3, we keep the hologram hidden until Phase 4 wires it in.
  const holo = createHologram(loadedAvatar)
  holo.setReveal(0)
  holo.root.visible = false
  holo.root.position.set(0, 0, 8) // off to the side, out of the camera frame
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
})

onBeforeUnmount(() => {
  hologram.value?.dispose()
  if (mailroom.value) disposeMailroom(mailroom.value)
  avatar.value?.dispose()
  room.value?.dispose()
  loader.value?.dispose()
  ctx.value?.dispose()

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
  <canvas ref="canvasRef" class="three-canvas" />
</template>
