<script setup lang="ts">
// Phase 0 stub. Phase 1 W2 will replace this with the full Vue shell.
import { profile } from './data/profile'
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-cream text-ink">
    <div class="text-center">
      <p class="font-mono text-xs uppercase tracking-widest text-grape">phase 0 — bootstrap complete</p>
      <h1 class="mt-3 font-display text-5xl font-black">{{ profile.name }}</h1>
      <p class="mt-2 text-ink/60">{{ profile.role }} · {{ profile.location }}</p>
      <p class="mt-6 max-w-md text-sm text-ink/50">
        Project scaffolded. Awaiting Phase 1 worker agents to build the Vue shell, Three.js core, and scroll layer.
      </p>
    </div>
  </main>
</template>
