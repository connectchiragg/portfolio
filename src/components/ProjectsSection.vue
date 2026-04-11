<script setup lang="ts">
import { projects } from '../data/projects'
</script>

<template>
  <section id="projects" class="relative isolate overflow-hidden bg-cream py-32">
    <div
      class="absolute top-20 right-10 h-96 w-96 rounded-full bg-magenta opacity-50 blur-3xl"
      aria-hidden="true"
    />
    <div
      class="absolute bottom-20 left-0 h-96 w-96 rounded-full bg-lemon opacity-60 blur-3xl"
      aria-hidden="true"
    />

    <div class="relative mx-auto max-w-6xl px-6">
      <div class="mb-16 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p
            class="mb-4 inline-block rounded-full bg-grape/10 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-grape ring-1 ring-grape/30"
          >
            // 02 — projects
          </p>
          <h2
            class="font-display text-5xl font-black tracking-tight text-ink sm:text-7xl"
          >
            Selected Work
          </h2>
        </div>
        <p class="max-w-xs text-sm text-ink/60">
          A handful of things I've designed, built, or broken on the way to
          learning something new.
        </p>
      </div>

      <div class="grid gap-6 sm:grid-cols-2">
        <a
          v-for="p in projects"
          :key="p.title"
          :href="p.href"
          class="group relative block overflow-hidden rounded-3xl border-2 border-ink/10 bg-white p-1 shadow-xl transition hover:-translate-y-1 hover:border-ink/30 hover:shadow-2xl"
        >
          <div
            :class="[
              'relative aspect-[5/3] overflow-hidden rounded-2xl bg-gradient-to-br',
              p.gradient,
            ]"
          >
            <div
              class="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/20 blur-2xl"
            />
            <div
              class="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-black/20 blur-2xl"
            />
            <div class="absolute inset-0 flex items-center justify-center">
              <span
                class="font-display text-5xl font-black uppercase tracking-tighter text-white drop-shadow-lg sm:text-6xl"
              >
                {{ p.title }}
              </span>
            </div>
            <div
              class="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-ink"
            >
              {{ p.tagline }}
            </div>
          </div>

          <div class="flex items-start justify-between gap-4 px-5 pt-5 pb-6">
            <div>
              <h3 class="font-display text-xl font-bold text-ink">
                {{ p.title }}
              </h3>
              <p class="mt-1 text-sm text-ink/60">{{ p.desc }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="t in p.tags"
                  :key="t"
                  class="rounded-full bg-ink/5 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/70"
                >
                  {{ t }}
                </span>
              </div>
            </div>
            <span
              class="grid h-10 w-10 flex-none place-items-center rounded-full bg-ink text-cream transition group-hover:rotate-45 group-hover:bg-tangerine"
            >
              ↗
            </span>
          </div>
        </a>

        <!-- start a new project card -->
        <a
          href="#contact"
          class="group flex items-center justify-center rounded-3xl border-2 border-dashed border-ink/30 bg-cream-2/40 p-10 text-center transition hover:border-tangerine hover:bg-cream-2 sm:col-span-2"
        >
          <div>
            <div
              class="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-tangerine text-2xl text-white shadow-lg shadow-tangerine/30 transition group-hover:scale-110"
            >
              +
            </div>
            <p class="font-display text-2xl font-bold text-ink">
              Start a new project
            </p>
            <p class="mt-1 text-sm text-ink/60">
              Got an idea? Let's turn it into something real.
            </p>
          </div>
        </a>
      </div>
    </div>
  </section>
</template>
