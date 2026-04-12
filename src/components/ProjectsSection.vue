<script setup lang="ts">
import { projects } from '../data/projects'
</script>

<template>
  <!--
    Cinematic noir gallery. The room scene burns through the right edge;
    the left two-thirds wash to graphite for legibility. No coloured blobs,
    no rainbow gradients — just image cards on a dark slab.
  -->
  <section
    id="projects"
    class="relative isolate overflow-hidden pt-4 pb-36"
    style="background: linear-gradient(to bottom, rgba(10,8,7,1) 0%, rgba(10,8,7,0.95) 50%, rgba(10,8,7,1) 100%);"
  >
    <div class="relative mx-auto max-w-6xl px-6">
      <div class="mb-20 flex flex-wrap items-end justify-between gap-6">
        <div>
          <p class="eyebrow mb-5 flex items-center gap-3">
            <span class="hair" />
            <span class="num">N° 02</span>
            <span>Selected work</span>
          </p>
          <h2
            class="font-display text-5xl font-medium tracking-[-0.02em] text-bone sm:text-7xl"
          >
            Things I've shipped<span class="text-ember">.</span>
          </h2>
        </div>
        <p class="max-w-xs font-mono text-[11px] leading-relaxed tracking-wide text-ash">
          A handful of products designed, built, or broken on the way to
          learning something new.
        </p>
      </div>

      <div class="grid gap-x-6 gap-y-16 sm:grid-cols-2">
        <a
          v-for="p in projects"
          :key="p.title"
          :href="p.href"
          class="group relative block"
        >
          <div class="relative overflow-hidden border border-bone/10 bg-graphite">
            <img
              :src="p.screenshot"
              :alt="p.title + ' screenshot'"
              class="aspect-[8/5] w-full object-cover transition duration-700 group-hover:scale-[1.03]"
              loading="lazy"
            />
            <div
              class="absolute inset-0 bg-gradient-to-t from-char/80 via-char/0 to-char/0"
              aria-hidden="true"
            />
            <div
              class="absolute left-4 top-4 font-mono text-[10px] uppercase tracking-[0.24em] text-bone/70"
            >
              {{ p.index }} · {{ p.year }}
            </div>
          </div>

          <div class="mt-5 flex items-start justify-between gap-4">
            <div>
              <h3
                class="font-display text-2xl font-medium tracking-tight text-bone group-hover:text-ember"
              >
                {{ p.title }}
              </h3>
              <p class="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ash">
                {{ p.tagline }}
              </p>
              <p class="mt-3 max-w-md text-sm leading-relaxed text-bone/65">
                {{ p.desc }}
              </p>
              <div class="mt-4 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ash">
                <span v-for="t in p.tags" :key="t">— {{ t }}</span>
              </div>
            </div>
            <span
              class="mt-2 grid h-9 w-9 flex-none place-items-center rounded-full border border-bone/20 text-bone/60 transition group-hover:border-ember group-hover:text-ember"
            >
              ↗
            </span>
          </div>
        </a>
      </div>

    </div>
  </section>
</template>
