<script setup lang="ts">
import MuteToggle from './MuteToggle.vue'

const links = [
  { href: '#about', label: 'About' },
  { href: '#projects', label: 'Work' },
  { href: '#contact', label: 'Contact' },
]
</script>

<template>
  <header class="fixed top-5 left-0 right-0 z-50 px-5">
    <div class="mx-auto flex max-w-6xl items-center justify-between gap-3">
      <a
        href="#top"
        class="grid h-11 w-11 place-items-center border border-bone/30 bg-char/70 font-display text-sm font-medium text-bone backdrop-blur transition hover:border-ember hover:text-ember"
        aria-label="Home"
      >
        CG
      </a>

      <nav
        class="hidden items-center gap-1 border border-bone/15 bg-char/70 px-1 py-1 backdrop-blur md:flex"
      >
        <a
          v-for="l in links"
          :key="l.href"
          :href="l.href"
          class="px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-bone/80 transition hover:text-ember"
        >
          {{ l.label }}
        </a>
      </nav>

      <div class="flex items-center gap-3">
        <a
          href="#contact"
          class="group inline-flex items-center gap-3 border border-ember bg-char/70 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.22em] text-ember backdrop-blur transition hover:bg-ember hover:text-char"
        >
          Get in touch
          <span class="transition-transform group-hover:translate-x-1">→</span>
        </a>
        <MuteToggle />
      </div>
    </div>
  </header>
</template>
