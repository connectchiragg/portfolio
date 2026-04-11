<script setup lang="ts">
import { profile } from '../data/profile'

const year = new Date().getFullYear()
</script>

<template>
  <footer class="relative z-10 py-10" style="background: rgba(255, 245, 233, 0.85);">
    <div
      class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row"
    >
      <a
        href="#top"
        class="grid h-12 w-12 place-items-center rounded-full bg-white text-ink shadow-md ring-1 ring-black/10 transition hover:-translate-y-1"
        aria-label="Back to top"
      >
        ↑
      </a>
      <div
        class="flex items-center gap-5 font-mono text-xs uppercase tracking-wider text-ink/60"
      >
        <a href="#" class="hover:text-ink">Privacy</a>
        <a href="#" class="hover:text-ink">Legal</a>
        <button
          type="button"
          class="rounded-full border border-ink/20 px-3 py-1 hover:border-ink"
        >
          EN
        </button>
      </div>
      <div class="text-right">
        <p class="font-mono text-xs text-ink/60">© {{ year }} {{ profile.name }}</p>
        <p class="mt-1 font-mono text-[10px] italic text-ink/40">
          Built between innings
        </p>
      </div>
    </div>
  </footer>
</template>
