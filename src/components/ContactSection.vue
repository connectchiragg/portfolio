<script setup lang="ts">
import { profile } from '../data/profile'

interface Social {
  label: string
  href: string
  icon: string
}

const socials: Social[] = [
  {
    label: 'Email',
    href: profile.socials.email,
    icon: '<path d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>',
  },
  {
    label: 'GitHub',
    href: profile.socials.github,
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.36-3.37-1.36-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.4 9.4 0 0112 6.84c.85 0 1.71.12 2.51.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49C19.14 20.58 22 16.76 22 12.26 22 6.58 17.52 2 12 2z"/>',
  },
  {
    label: 'LinkedIn',
    href: profile.socials.linkedin,
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z"/>',
  },
  {
    label: 'X',
    href: profile.socials.x,
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4l16 16M20 4L4 20"/>',
  },
]

const emailHref = profile.socials.email
const emailDisplay = emailHref.replace(/^mailto:/, '')
</script>

<template>
  <section
    id="contact"
    class="relative isolate overflow-hidden bg-cream-2 py-32"
  >
    <div
      class="absolute top-0 left-1/4 h-96 w-96 rounded-full bg-tangerine opacity-50 blur-3xl"
      aria-hidden="true"
    />
    <div
      class="absolute bottom-10 right-10 h-96 w-96 rounded-full bg-grape opacity-40 blur-3xl"
      aria-hidden="true"
    />

    <div class="relative mx-auto max-w-6xl px-6">
      <div class="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <p
            class="mb-4 inline-block rounded-full bg-tangerine/15 px-3 py-1 font-mono text-xs font-bold uppercase tracking-widest text-tangerine ring-1 ring-tangerine/40"
          >
            // 03 — contact
          </p>
          <h2
            class="font-display text-5xl font-black leading-[0.95] tracking-tight text-ink sm:text-7xl"
          >
            Let's work<br />
            <span class="text-tangerine">together!</span>
          </h2>
          <p class="mt-6 max-w-md text-lg text-ink/70">
            Got a product to build, an idea to validate, or just want to say hi?
            My inbox is open.
          </p>

          <div class="mt-10 flex flex-wrap gap-3">
            <a
              v-for="s in socials"
              :key="s.label"
              :href="s.href"
              :aria-label="s.label"
              class="group grid h-14 w-14 place-items-center rounded-full bg-white text-ink shadow-lg ring-1 ring-black/10 transition hover:-translate-y-1 hover:bg-ink hover:text-cream"
            >
              <svg
                class="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                v-html="s.icon"
              />
            </a>
          </div>

          <a
            :href="emailHref"
            class="mt-10 inline-flex items-center gap-3 rounded-full bg-ink px-7 py-5 font-display text-base font-bold uppercase tracking-wider text-cream shadow-xl transition hover:scale-105 hover:bg-tangerine"
          >
            {{ emailDisplay }}
            <span>→</span>
          </a>
        </div>

        <!-- placeholder for 3D scene / illustration -->
        <div class="relative flex justify-center lg:justify-end">
          <div
            class="relative aspect-square w-full max-w-sm rounded-[2.5rem] bg-gradient-to-br from-grape via-magenta to-tangerine p-1 shadow-2xl shadow-magenta/30"
          >
            <div
              class="relative grid h-full w-full place-items-center overflow-hidden rounded-[2.25rem] bg-cream text-center"
            >
              <p
                class="px-6 font-mono text-sm font-bold uppercase tracking-widest text-ink/60"
              >
                3D mailroom<br />mounts here
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
