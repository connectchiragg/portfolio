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
  <section
    id="top"
    class="relative isolate min-h-screen overflow-hidden bg-cream pt-32 pb-20"
  >
    <!-- gradient blobs -->
    <div
      class="absolute top-10 -left-20 h-[420px] w-[420px] rounded-full bg-magenta opacity-50 blur-3xl"
      aria-hidden="true"
    />
    <div
      class="absolute top-40 right-0 h-[480px] w-[480px] rounded-full bg-grape opacity-40 blur-3xl"
      aria-hidden="true"
    />
    <div
      class="absolute bottom-0 left-1/3 h-[380px] w-[380px] rounded-full bg-lemon opacity-50 blur-3xl"
      aria-hidden="true"
    />

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

      <!-- placeholder for the 3D scene mount -->
      <div class="relative z-10 flex justify-center lg:justify-end">
        <div
          class="relative aspect-square w-full max-w-md rotate-3 rounded-[2.5rem] bg-gradient-to-br from-tangerine via-magenta to-grape p-1 shadow-2xl shadow-grape/30"
        >
          <div
            class="relative grid h-full w-full place-items-center overflow-hidden rounded-[2.25rem] bg-cream-2 text-center"
          >
            <p
              class="px-6 font-mono text-sm font-bold uppercase tracking-widest text-ink/60"
            >
              3D scene<br />mounts here
            </p>
            <div
              class="absolute left-4 top-4 -rotate-6 rounded-lg bg-white px-3 py-2 font-mono text-xs font-bold text-ink shadow-md ring-1 ring-black/10"
            >
              &lt;/&gt; coding
            </div>
            <div
              class="absolute bottom-6 right-4 rotate-3 rounded-lg bg-mint px-3 py-2 font-mono text-xs font-bold text-ink shadow-md ring-1 ring-black/10"
            >
              shipping
            </div>
          </div>
        </div>
      </div>
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
