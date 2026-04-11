<script setup lang="ts">
import { profile } from '../data/profile'

const firstName = profile.name.split(' ')[0] ?? profile.name
</script>

<template>
  <section
    id="about"
    class="relative isolate overflow-hidden bg-deep py-32 text-cream"
  >
    <!-- cyan grid background -->
    <div
      class="absolute inset-0 opacity-30"
      aria-hidden="true"
      style="
        background-image:
          linear-gradient(to right, rgba(74, 216, 255, 0.15) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(74, 216, 255, 0.15) 1px, transparent 1px);
        background-size: 48px 48px;
      "
    />
    <div
      class="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-grape opacity-40 blur-3xl"
      aria-hidden="true"
    />
    <div
      class="absolute bottom-0 right-10 h-96 w-96 rounded-full bg-cyan opacity-30 blur-3xl"
      aria-hidden="true"
    />

    <div class="relative mx-auto max-w-6xl px-6">
      <div class="mb-16 flex items-end justify-between">
        <div>
          <p
            class="mb-4 inline-block rounded-full bg-cyan/15 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-cyan ring-1 ring-cyan/30"
          >
            // 01 — about
          </p>
          <h2 class="font-display text-5xl font-black tracking-tight sm:text-6xl">
            Identified
          </h2>
        </div>
        <div
          class="hidden font-mono text-xs uppercase tracking-widest text-cyan/70 sm:block"
        >
          SCAN COMPLETE · 100%
        </div>
      </div>

      <div class="grid items-center gap-12 lg:grid-cols-12">
        <!-- left callouts -->
        <div class="space-y-6 lg:col-span-4">
          <div
            class="rounded-2xl border border-cyan/30 bg-cyan/5 p-5 font-mono shadow-xl shadow-cyan/5 backdrop-blur"
          >
            <p class="text-2xl font-bold text-cream">{{ firstName }}</p>
            <p class="mt-1 flex items-center gap-1 text-xs text-cyan/80">
              <svg
                class="h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <circle
                  cx="12"
                  cy="11"
                  r="3"
                  stroke-width="2"
                  stroke-linecap="round"
                />
              </svg>
              {{ profile.location }}
            </p>
          </div>

          <div
            class="rounded-2xl border border-cyan/30 bg-cyan/5 p-5 font-mono text-sm leading-relaxed text-cream/90 shadow-xl shadow-cyan/5 backdrop-blur"
          >
            {{ profile.bio }}
          </div>
        </div>

        <!-- center placeholder for hologram -->
        <div class="lg:col-span-4">
          <div
            class="relative mx-auto grid aspect-[3/4] w-64 place-items-center overflow-hidden rounded-3xl border border-cyan/40 bg-gradient-to-b from-cyan/10 via-grape/10 to-transparent text-center"
          >
            <p
              class="px-6 font-mono text-xs font-bold uppercase tracking-widest text-cyan/80"
            >
              3D hologram<br />mounts here
            </p>
            <div
              class="absolute bottom-3 left-1/2 -translate-x-1/2 rounded bg-deep-2 px-3 py-1 font-mono text-xs text-cyan ring-1 ring-cyan/40"
            >
              ID_072
            </div>
          </div>
        </div>

        <!-- right callout: skills -->
        <div class="lg:col-span-4">
          <div
            class="rounded-2xl border border-cyan/30 bg-cyan/5 p-5 font-mono shadow-xl shadow-cyan/5 backdrop-blur"
          >
            <p class="mb-3 text-base font-bold text-cream">Skills</p>
            <ul class="space-y-2 text-sm text-cream/90">
              <li
                v-for="s in profile.skills"
                :key="s"
                class="flex items-start gap-2"
              >
                <span class="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-cyan" />
                {{ s }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
