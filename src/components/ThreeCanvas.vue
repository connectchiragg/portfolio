<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { Mesh, BoxGeometry, MeshStandardMaterial } from 'three'
import { createScene } from '../three/Scene'
import { createRoomLights } from '../three/lights'
import type { SceneContext, RoomLights } from '../three/contracts'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const ctx = shallowRef<SceneContext | null>(null)
const lights = shallowRef<RoomLights | null>(null)

onMounted(() => {
  if (!canvasRef.value) return
  const scene = createScene({ canvas: canvasRef.value })
  const roomLights = createRoomLights()
  roomLights.attach(scene.scene)

  // Phase 1 placeholder: a single rotating cube proves the canvas + lights
  // are wired. Phase 3 (W5) replaces this with the actual room/desk scene.
  const cube = new Mesh(
    new BoxGeometry(1, 1, 1),
    new MeshStandardMaterial({ color: '#6b2bd9', roughness: 0.3, metalness: 0.1 }),
  )
  cube.castShadow = true
  cube.position.set(0, 1.2, 0)
  scene.scene.add(cube)

  scene.onTick((dt) => {
    cube.rotation.y += dt * 0.6
    cube.rotation.x += dt * 0.2
  })

  ctx.value = scene
  lights.value = roomLights
})

onBeforeUnmount(() => {
  ctx.value?.dispose()
  ctx.value = null
  lights.value = null
})
</script>

<template>
  <canvas ref="canvasRef" class="three-canvas" />
</template>
