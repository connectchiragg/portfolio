<script setup lang="ts">
import MuteToggle from './MuteToggle.vue'

defineProps<{ visible?: boolean }>()
</script>

<template>
  <header v-if="visible" class="fixed top-5 left-0 right-0 z-50 px-5">
    <div class="mx-auto flex max-w-6xl items-center justify-end gap-3">
      <a
        href="#contact"
        class="group inline-flex items-center gap-3 border border-ember bg-char/70 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ember backdrop-blur transition hover:bg-ember hover:text-char"
      >
        Get in touch
        <span class="transition-transform group-hover:translate-x-1">→</span>
      </a>
      <MuteToggle />
    </div>
  </header>
</template>
