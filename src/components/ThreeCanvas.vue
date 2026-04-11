<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const canvasRef = ref<HTMLCanvasElement | null>(null)

onMounted(() => {
  // TODO(phase1-merge): wire createScene(canvasRef.value) once W1's Scene.ts is in place
  void canvasRef.value
})

onBeforeUnmount(() => {
  // TODO(phase1-merge): call sceneCtx.dispose() here once wired
})
</script>

<template>
  <canvas ref="canvasRef" class="three-canvas" />
</template>
