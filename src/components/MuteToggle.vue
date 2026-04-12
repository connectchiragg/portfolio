<script setup lang="ts">
import { ref } from 'vue'
import { toggleMute, isMuted } from '../audio/sounds'

const muted = ref(isMuted())

const toggle = () => {
  muted.value = toggleMute()
}
</script>

<template>
  <button
    @click="toggle"
    class="flex h-10 w-10 items-center justify-center rounded-full border border-bone/20 text-bone/70 transition hover:border-bone/40 hover:text-bone"
    :aria-label="muted ? 'Unmute' : 'Mute'"
  >
    <!-- Speaker icon -->
    <svg v-if="!muted" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
    <!-- Muted icon -->
    <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  </button>
</template>
