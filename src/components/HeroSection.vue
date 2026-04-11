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
    The section is mostly transparent so the persistent 3D canvas shows
    through. A horizontal gradient gives the LEFT half of the viewport a
    soft cream wash for text legibility, fading to transparent on the
    right where the 3D room scene lives.
  -->
  <section
    id="top"
    class="relative isolate min-h-screen overflow-hidden pt-32 pb-20"
    style="background: linear-gradient(to right, rgba(255, 245, 233, 0.85) 0%, rgba(255, 245, 233, 0.7) 30%, rgba(255, 245, 233, 0) 60%, rgba(255, 245, 233, 0) 100%);"
  >
    <div
      class="relative mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2"
    >
      <div id="hero" class="relative z-10">
        <p
          v-if="profile.available"
          class="mb-6 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest text-grape ring-1 ring-grape/20 backdrop-blur"
        >
          <span class="h-2 w-2 animate-pulse rounded-full bg-mint" />
          Available for new work
        </p>

        <h1
          class="font-display text-6xl font-black leading-[0.9] tracking-tight text-ink sm:text-7xl lg:text-8xl"
        >
          {{ nameParts.first }}<br v-if="nameParts.rest" />{{ nameParts.rest }}
        </h1>

        <div class="mt-6 inline-block -rotate-2">
          <span
            class="inline-block rounded-md bg-grape px-4 py-2 font-mono text-sm font-bold uppercase tracking-wider text-white shadow-lg"
          >
            {{ profile.role }}
          </span>
        </div>

        <p class="mt-8 max-w-md text-lg text-ink/70">
          {{ profile.bio }}
        </p>

        <div class="mt-10 flex flex-wrap items-center gap-4">
          <a
            href="#projects"
            class="group inline-flex items-center gap-2 rounded-full bg-ink px-6 py-4 text-sm font-bold uppercase tracking-wider text-cream transition hover:scale-105 hover:bg-grape"
          >
            See my work
            <span class="transition-transform group-hover:translate-x-1">→</span>
          </a>
          <a
            href="#about"
            class="inline-flex items-center gap-2 rounded-full border-2 border-ink/20 bg-white/60 px-6 py-4 text-sm font-bold uppercase tracking-wider text-ink backdrop-blur transition hover:border-ink/60"
          >
            About me
          </a>
        </div>
      </div>

      <!--
        Right column intentionally empty — the 3D room scene from
        ThreeCanvas peeks through the transparent right side of the
        section gradient and visually fills this space.
      -->
      <div class="hidden lg:block" aria-hidden="true" />
    </div>

    <!-- scroll cue -->
    <div
      class="absolute bottom-8 left-1/2 -translate-x-1/2 text-ink/60"
      aria-hidden="true"
    >
      <div class="flex flex-col items-center gap-2">
        <div class="h-8 w-5 rounded-full border-2 border-current p-1">
          <div class="h-1.5 w-full rounded-full bg-current" />
        </div>
        <span class="font-mono text-[10px] uppercase tracking-widest">scroll</span>
      </div>
    </div>
  </section>
</template>
