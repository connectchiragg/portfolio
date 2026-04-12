<script setup lang="ts">
import { profile } from '../data/profile'

const firstName = profile.name.split(' ')[0] ?? profile.name
</script>

<template>
  <!--
    The hologram fills the centre. We sit two narrow callouts on the
    flanks — graphite cards with cyan hairlines, no rounded blobs.
  -->
  <section
    id="about"
    class="relative isolate overflow-hidden pt-36 pb-[120vh] text-bone"
    style="background: linear-gradient(to bottom, rgba(6,10,38,0.55) 0%, rgba(6,10,38,0.45) 50%, rgba(6,10,38,0.55) 100%);"
  >
    <div class="relative mx-auto max-w-6xl px-6">
      <div class="mb-20 flex items-end justify-between">
        <div>
          <p class="eyebrow mb-5 flex items-center gap-3">
            <span class="hair" style="color: var(--color-cyan);" />
            <span class="num" style="color: var(--color-cyan);">N° 01</span>
            <span>The Subject</span>
          </p>
          <h2
            class="font-display text-5xl font-medium tracking-[-0.02em] sm:text-7xl"
          >
            Identified.
          </h2>
        </div>
        <div
          class="hidden font-mono text-[10px] uppercase tracking-[0.28em] text-cyan/70 sm:block"
        >
          ◇ Scan complete · 100%
        </div>
      </div>

      <div class="grid items-start gap-10 lg:grid-cols-12">
        <!-- left callouts -->
        <div class="space-y-6 lg:col-span-4">
          <div
            class="border border-cyan/25 bg-char/55 p-6 font-mono backdrop-blur-sm"
          >
            <p class="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan/70">
              Identity
            </p>
            <p class="mt-3 font-display text-3xl font-medium tracking-tight text-bone">
              {{ firstName }}
            </p>
            <p class="mt-2 font-mono text-[11px] tracking-wide text-bone/60">
              {{ profile.location }}
            </p>
          </div>

          <div
            class="border border-cyan/25 bg-char/55 p-6 font-mono text-[13px] leading-relaxed text-bone/85 backdrop-blur-sm"
          >
            <p class="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan/70">
              Brief
            </p>
            {{ profile.bio }}
          </div>
        </div>

        <!-- centre — empty for hologram -->
        <div class="hidden lg:col-span-4 lg:block" aria-hidden="true" />

        <!-- right callout: skills -->
        <div class="lg:col-span-4">
          <div
            class="border border-cyan/25 bg-char/55 p-6 font-mono backdrop-blur-sm"
          >
            <p class="mb-4 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan/70">
              Stack
            </p>
            <ul class="space-y-2.5 text-[13px] text-bone/85">
              <li
                v-for="(s, i) in profile.skills"
                :key="s"
                class="flex items-baseline gap-3"
              >
                <span class="font-mono text-[10px] tabular-nums text-cyan/60">
                  {{ String(i + 1).padStart(2, '0') }}
                </span>
                {{ s }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
