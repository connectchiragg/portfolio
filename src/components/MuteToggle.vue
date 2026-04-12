<script setup lang="ts">
import { ref, onMounted } from 'vue'

const muted = ref(false)

onMounted(() => {
  muted.value = localStorage.getItem('muted') === 'true'
})

const emit = defineEmits<{ (e: 'change', muted: boolean): void }>()

function toggle() {
  muted.value = !muted.value
  localStorage.setItem('muted', String(muted.value))
  emit('change', muted.value)
}
</script>

<template>
  <button
    type="button"
    @click="toggle"
    :aria-label="muted ? 'Unmute' : 'Mute'"
    class="grid h-11 w-11 place-items-center border border-bone/30 bg-char/70 text-bone/80 backdrop-blur transition hover:border-ember hover:text-ember"
  >
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path v-if="!muted" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M19.071 4.929a10 10 0 010 14.142M9 9H5a1 1 0 00-1 1v4a1 1 0 001 1h4l5 4V5L9 9z" />
      <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 9H5a1 1 0 00-1 1v4a1 1 0 001 1h4l5 4V5L9 9zM17 9l4 4m0-4l-4 4" />
    </svg>
  </button>
</template>
