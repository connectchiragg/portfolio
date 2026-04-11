<script setup lang="ts">
import MuteToggle from './MuteToggle.vue'

const links = [
  { href: '#about', label: 'About' },
  { href: '#projects', label: 'Projects' },
  { href: '#contact', label: 'Contact' },
]
</script>

<template>
  <header class="fixed top-4 left-0 right-0 z-50 px-4">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-3">
      <a
        href="#top"
        class="grid h-12 w-12 place-items-center rounded-2xl bg-ink text-cream shadow-lg ring-2 ring-black/10"
        aria-label="Home"
      >
        <span class="font-display text-xl font-bold">CG</span>
      </a>

      <nav
        class="hidden items-center gap-1 rounded-full bg-white/85 px-2 py-2 shadow-lg ring-1 ring-black/5 backdrop-blur md:flex"
      >
        <a
          v-for="l in links"
          :key="l.href"
          :href="l.href"
          class="rounded-full px-5 py-2 text-sm font-bold uppercase tracking-wider text-ink transition hover:bg-tangerine hover:text-white"
        >
          {{ l.label }}
        </a>
      </nav>

      <div class="flex items-center gap-3">
        <a
          href="#contact"
          class="group inline-flex items-center gap-2 rounded-full bg-tangerine px-5 py-3 text-sm font-bold uppercase tracking-wider text-white shadow-lg shadow-tangerine/40 ring-1 ring-black/10 transition hover:scale-105 hover:bg-magenta"
        >
          Get in touch
          <span class="transition-transform group-hover:translate-x-1">→</span>
        </a>
        <MuteToggle />
      </div>
    </div>
  </header>
</template>
