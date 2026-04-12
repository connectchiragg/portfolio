<script setup lang="ts">
import { computed } from 'vue'
import { profile } from '../data/profile'

const nameParts = computed(() => {
  const parts = profile.name.split(' ')
  return {
    first: parts[0] ?? profile.name,
    rest: parts.slice(1).join(' '),
  }
})
</script>

<template>
  <!--
    Cinematic noir hero. The left half gets a soft graphite vignette so
    the type stays legible while the 3D desk scene burns through on the
    right. No coloured blobs, no rotated badges — just type, an ember
    accent, and a hairline rule.
  -->
  <section
    id="top"
    class="relative isolate min-h-screen overflow-hidden pt-32 pb-24"
    style="background: linear-gradient(to right, rgba(10,8,7,0.86) 0%, rgba(10,8,7,0.7) 32%, rgba(10,8,7,0.0) 62%, rgba(10,8,7,0.0) 100%);"
  >
    <div
      class="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-12"
    >
      <div id="hero" class="relative z-10 lg:col-span-7">
        <p class="eyebrow mb-8 flex items-center gap-3">
          <span class="hair" />
          <span class="num">N° 00</span>
          <span>Late Night, Bengaluru</span>
        </p>

        <h1
          class="font-display text-[3.6rem] font-medium leading-[0.92] tracking-[-0.02em] text-bone sm:text-7xl lg:text-[6.5rem]"
        >
          {{ nameParts.first }}<span class="text-ember">.</span><br v-if="nameParts.rest" />{{ nameParts.rest }}
        </h1>

        <div class="mt-8 flex items-center gap-4 font-mono text-xs uppercase tracking-[0.22em] text-ash">
          <span class="hair" />
          <span>{{ profile.role }}</span>
          <span class="opacity-40">/</span>
          <span>{{ profile.location }}</span>
        </div>

        <p class="mt-8 max-w-md font-display text-base leading-relaxed text-bone/75">
          {{ profile.bio }}
        </p>

        <div class="mt-12 flex flex-wrap items-center gap-4">
          <a
            href="#projects"
            class="group inline-flex items-center gap-3 rounded-none border border-bone/80 bg-transparent px-7 py-4 font-mono text-[11px] font-medium uppercase tracking-[0.24em] text-bone transition hover:border-ember hover:text-ember"
          >
            Selected work
            <span class="transition-transform group-hover:translate-x-1">→</span>
          </a>
          <a
            href="#about"
            class="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.24em] text-ash transition hover:text-bone"
          >
            <span class="hair" />
            About
          </a>
        </div>

        <p
          v-if="profile.available"
          class="mt-14 inline-flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em] text-ash"
        >
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-ember opacity-60" />
            <span class="relative inline-flex h-2 w-2 rounded-full bg-ember" />
          </span>
          Open for work — Q2 / 26
        </p>
      </div>

      <!-- right column intentionally empty (3D scene) -->
      <div class="hidden lg:col-span-5 lg:block" aria-hidden="true" />
    </div>

    <!-- scroll cue -->
    <div
      class="absolute bottom-10 left-1/2 -translate-x-1/2 text-bone/40"
      aria-hidden="true"
    >
      <div class="flex flex-col items-center gap-2">
        <span class="font-mono text-[10px] uppercase tracking-[0.32em]">Scroll</span>
        <span class="block h-10 w-px bg-current" />
      </div>
    </div>
  </section>
</template>
