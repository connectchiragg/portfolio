<script setup lang="ts">
import { profile } from '../data/profile'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="relative z-10 py-12" style="background: rgba(10,8,7,0.92);">
    <div
      class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-6 sm:flex-row"
    >
      <a
        href="#top"
        class="grid h-11 w-11 place-items-center border border-bone/20 text-bone/70 transition hover:-translate-y-0.5 hover:border-ember hover:text-ember"
        aria-label="Back to top"
      >
        ↑
      </a>
      <div
        class="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.24em] text-ash"
      >
        <router-link to="/privacy" class="hover:text-bone">Privacy</router-link>
        <span class="opacity-30">·</span>
        <router-link to="/legal" class="hover:text-bone">Legal</router-link>
        <span class="opacity-30">·</span>
        <span>Built between innings</span>
      </div>
      <p class="font-mono text-[10px] uppercase tracking-[0.24em] text-ash">
        © {{ year }} {{ profile.name }}
      </p>
    </div>
    <p
      class="mx-auto mt-6 max-w-6xl px-6 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-ash/60"
    >
      Music:
      <a
        href="https://pixabay.com/music/traditional-jazz-dancing-saxophone-dark-jazz-388468/"
        target="_blank"
        rel="noreferrer"
        class="transition hover:text-bone"
      >
        Dancing Saxophone (dark jazz)
      </a>
      by Surprising_Media
      <span class="opacity-40">·</span>
      <a
        href="https://pixabay.com/music/beats-futuristic-sci-fi-268233/"
        target="_blank"
        rel="noreferrer"
        class="transition hover:text-bone"
      >
        Futuristic Sci Fi
      </a>
      by Rockot from Pixabay
    </p>
  </footer>
</template>
