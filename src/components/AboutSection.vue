<script setup lang="ts">
import { profile } from '../data/profile'
import { ref, onMounted, onBeforeUnmount } from 'vue'

const firstName = profile.name.split(' ')[0] ?? profile.name

const dossierWrap = ref<HTMLElement | null>(null)
const visibleLines = ref<Set<number>>(new Set())
const currentLine = ref(-1)
let scrollCleanup: (() => void) | null = null

const TOTAL_LINES = 28

onMounted(() => {
  const wrap = dossierWrap.value
  if (!wrap) return

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) {
    for (let i = 0; i < TOTAL_LINES; i++) visibleLines.value.add(i)
    return
  }

  const onScroll = () => {
    const rect = wrap.getBoundingClientRect()
    const vh = window.innerHeight

    // Don't process if entirely off screen
    if (rect.bottom < 0 || rect.top > vh) return

    // progress: 0 when wrap top enters viewport, 1 when wrap bottom exits top
    const progress = Math.max(0, Math.min(1, (vh - rect.top) / (rect.height + vh * 0.3)))

    let newLast = -1
    for (let i = 0; i < TOTAL_LINES; i++) {
      const threshold = (i + 0.5) / (TOTAL_LINES + 2)
      if (progress >= threshold) {
        visibleLines.value.add(i)
        newLast = i
      } else {
        visibleLines.value.delete(i)
      }
    }
    currentLine.value = newLast
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  scrollCleanup = () => window.removeEventListener('scroll', onScroll)
})

onBeforeUnmount(() => {
  scrollCleanup?.()
})
</script>

<template>
  <section
    id="about"
    class="relative isolate pt-56 pb-[30vh] text-bone"
    style="background: linear-gradient(to bottom, transparent 0%, transparent 52%, rgba(6,10,38,0.5) 58%, rgba(8,9,22,0.75) 63%, rgba(10,8,7,0.9) 69%, rgba(10,8,7,1) 75%, rgba(10,8,7,1) 100%);"
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
        <p class="hidden max-w-xs font-mono text-[14px] leading-relaxed tracking-wide text-bone/50 sm:block">
          ◇ Scanning · <span id="scan-pct" class="transition-colors duration-300">0%</span>
        </p>
      </div>

      <div class="grid items-start gap-8 lg:grid-cols-12">
        <div class="space-y-4 lg:col-span-4">
          <div class="border border-cyan/25 bg-char/55 p-6 backdrop-blur-sm">
            <p class="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan/70">
              Identity
            </p>
            <p class="font-display text-2xl font-medium tracking-tight">
              {{ firstName }}
            </p>
            <p class="mt-2 font-mono text-[11px] tracking-wide text-bone/60">
              {{ profile.location }}
            </p>
          </div>
          <div class="border border-cyan/25 bg-char/55 p-6 font-mono text-[13px] leading-relaxed text-bone/85 backdrop-blur-sm">
            <p class="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-cyan/70">
              Service Record
            </p>
            <ul class="space-y-2">
              <li class="flex justify-between gap-4">
                <span>Sense</span>
                <span class="text-[11px] text-bone/50">Oct 2024 – Present</span>
              </li>
              <li class="flex justify-between gap-4">
                <span>StepChange</span>
                <span class="text-[11px] text-bone/50">Dec 2022 – Sep 2024</span>
              </li>
              <li class="flex justify-between gap-4">
                <span>Freelance</span>
                <span class="text-[11px] text-bone/50">May 2022 – Nov 2022</span>
              </li>
              <li class="flex justify-between gap-4">
                <span>Javis</span>
                <span class="text-[11px] text-bone/50">Nov 2020 – Apr 2022</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="hidden lg:col-span-4 lg:block" aria-hidden="true" />
        <div class="lg:col-span-4">
          <div class="border border-cyan/25 bg-char/55 p-6 font-mono backdrop-blur-sm">
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

    <!-- CLASSIFIED DOSSIER — inline in the padding zone, scrolls with page -->
    <div ref="dossierWrap" class="mx-auto mt-[70vh] max-w-2xl px-6 font-mono text-[11px] leading-[2.4] tracking-[0.08em]">

      <div :class="['dossier-line', { visible: visibleLines.has(0), current: currentLine === 0 }]">
        <span class="text-cyan/30">┌──────────────────────────────────────────────────┐</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(1), current: currentLine === 1 }]">
        <span class="text-cyan/30">│</span>
        <span class="ml-2 text-[13px] font-medium tracking-[0.32em] text-ember">CLASSIFIED DOSSIER</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(2), current: currentLine === 2 }]">
        <span class="text-cyan/30">│</span>
        <span class="ml-2 text-ash/40">REF: CG-BLR-2026-0413 · PRIORITY: HIGH</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(3), current: currentLine === 3 }]">
        <span class="text-cyan/30">│</span>
        <span class="ml-2 text-ash/40">DIVISION: ENGINEERING · SECTOR 7G</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(4), current: currentLine === 4 }]">
        <span class="text-cyan/30">└──────────────────────────────────────────────────┘</span>
      </div>

      <div :class="['dossier-line mt-8', { visible: visibleLines.has(5), current: currentLine === 5 }]">
        <span class="text-cyan/50">SUBJECT:</span>
        <span class="ml-4 text-bone/80">GOEL, CHIRAG</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(6), current: currentLine === 6 }]">
        <span class="text-cyan/50">ALIAS:</span>
        <span class="ml-6 text-bone/80">omen</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(7), current: currentLine === 7 }]">
        <span class="text-cyan/50">LOCATION:</span>
        <span class="ml-3 text-bone/80">12.9716° N, 77.5946° E</span>
        <span class="ml-2 text-ash/35">// BANGALORE, INDIA</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(8), current: currentLine === 8 }]">
        <span class="text-cyan/50">STATUS:</span>
        <span class="ml-5 text-ember">ACTIVE</span>
        <span class="ml-2 text-ash/20">▮▮▮▮▮▮▮▮</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(9), current: currentLine === 9 }]">
        <span class="text-cyan/50">EDUCATION:</span>
        <span class="ml-2 text-bone/80">IIT BHU · B.TECH · 2016–2020</span>
      </div>

      <div :class="['dossier-line mt-8', { visible: visibleLines.has(10), current: currentLine === 10 }]">
        <span class="text-cyan/50">FIELD REPORT:</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(11), current: currentLine === 11 }]">
        <span class="text-bone/60">Subject demonstrates abnormal proficiency in</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(12), current: currentLine === 12 }]">
        <span class="text-bone/60">backend systems, data pipelines, and cloud infra.</span>
        <span class="ml-1 text-ash/15">████████</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(13), current: currentLine === 13 }]">
        <span class="text-ash/15">████████</span>
        <span class="ml-1 text-bone/60">Known to operate between 2300h and 0400h.</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(14), current: currentLine === 14 }]">
        <span class="text-bone/60">Built climate risk models for</span>
        <span class="ml-1 text-ash/15">██████████████</span>
        <span class="ml-1 text-bone/60">major banks.</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(15), current: currentLine === 15 }]">
        <span class="text-bone/60">Architected multi-tenant data warehouse processing</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(16), current: currentLine === 16 }]">
        <span class="text-bone/60">100GB+ datasets. Latency under one minute.</span>
        <span class="ml-1 text-ash/15">████</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(17), current: currentLine === 17 }]">
        <span class="text-bone/60">Reduced deployment times by</span>
        <span class="ml-1 text-ember">75%</span>
        <span class="ml-1 text-bone/60">via CI/CD overhaul.</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(18), current: currentLine === 18 }]">
        <span class="text-bone/60">Designed custom RBAC for</span>
        <span class="ml-1 text-ash/15">████████████</span>
        <span class="ml-1 text-bone/60">enterprise auth.</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(19), current: currentLine === 19 }]">
        <span class="text-ash/15">██████</span>
        <span class="ml-1 text-bone/60">Built AI assistant with vector embeddings on</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(20), current: currentLine === 20 }]">
        <span class="text-bone/60">multi-tenant data. Anomaly detection via</span>
        <span class="ml-1 text-ash/15">████████</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(21), current: currentLine === 21 }]">
        <span class="text-bone/60">statistical scoring. Threat level:</span>
        <span class="ml-1 text-ember">ZERO</span>
        <span class="ml-3 text-ash/30">// unless provoked with bad code</span>
      </div>

      <div :class="['dossier-line mt-8', { visible: visibleLines.has(22), current: currentLine === 22 }]">
        <span class="text-cyan/50">RECOMMENDATION:</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(23), current: currentLine === 23 }]">
        <span class="text-bone/60">Recruit immediately. Do not let</span>
        <span class="ml-1 text-ash/15">████████</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(24), current: currentLine === 24 }]">
        <span class="text-ash/15">████████████</span>
        <span class="ml-1 text-bone/60">acquire subject first.</span>
      </div>

      <div :class="['dossier-line mt-10', { visible: visibleLines.has(25), current: currentLine === 25 }]">
        <span class="text-cyan/20">· · · · · · · · · · · · · · · · · · · · · · · · · ·</span>
      </div>
      <div :class="['dossier-line mt-2', { visible: visibleLines.has(26), current: currentLine === 26 }]">
        <span class="text-[14px] tracking-[0.28em] text-ember">▸ CLEARANCE: GRANTED</span>
      </div>
      <div :class="['dossier-line', { visible: visibleLines.has(27), current: currentLine === 27 }]">
        <span class="text-ash/50">OPENING FILE ARCHIVE...</span>
      </div>

    </div>
  </section>
</template>

<style scoped>
.dossier-line {
  opacity: 0;
  transform: translateY(8px);
  filter: blur(3px);
  transition: opacity 0.5s ease, transform 0.5s ease, filter 0.5s ease;
}

.dossier-line.visible {
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

.dossier-line.current::after {
  content: '▮';
  color: var(--color-cyan);
  animation: blink 0.7s step-end infinite;
  margin-left: 4px;
  font-size: 12px;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}


</style>
