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
    icon: '<path d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/>',
  },
  {
    label: 'GitHub',
    href: profile.socials.github,
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.5 2.87 8.32 6.84 9.67.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.71-2.78.62-3.37-1.36-3.37-1.36-.46-1.18-1.11-1.5-1.11-1.5-.91-.63.07-.62.07-.62 1 .07 1.53 1.05 1.53 1.05.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.4 9.4 0 0112 6.84c.85 0 1.71.12 2.51.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49C19.14 20.58 22 16.76 22 12.26 22 6.58 17.52 2 12 2z"/>',
  },
  {
    label: 'LinkedIn',
    href: profile.socials.linkedin,
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-4 0v7h-4v-7a6 6 0 016-6zM2 9h4v12H2zM4 6a2 2 0 100-4 2 2 0 000 4z"/>',
  },
  {
    label: 'X',
    href: profile.socials.x,
    icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" d="M4 4l16 16M20 4L4 20"/>',
  },
]

const emailHref = profile.socials.email
const emailDisplay = emailHref.replace(/^mailto:/, '')
</script>

<template>
  <!--
    Dawn arc — the lighting rig in lights.ts shifts the room toward warm
    sunrise, but the HTML stays graphite so the type holds. The mailroom
    on the canvas reads through the right-hand transparency.
  -->
  <section
    id="contact"
    class="relative isolate overflow-hidden pt-36 pb-36"
    style="background: linear-gradient(to bottom, rgba(10,8,7,0.95) 0%, rgba(10,8,7,0.4) 15%, transparent 30%), linear-gradient(to right, rgba(10,8,7,0.92) 0%, rgba(10,8,7,0.78) 38%, rgba(10,8,7,0.0) 68%, rgba(10,8,7,0.0) 100%);"
  >
    <div class="relative mx-auto max-w-6xl px-6">
      <div class="grid items-center gap-16 lg:grid-cols-12">
        <div class="lg:col-span-7">
          <p class="eyebrow mb-5 flex items-center gap-3">
            <span class="hair" />
            <span class="num">N° 03</span>
            <span>The mailroom</span>
          </p>
          <h2
            class="font-display text-5xl font-medium leading-[0.95] tracking-[-0.02em] text-bone sm:text-7xl"
          >
            Got a brief?<br />
            <span class="text-ember">Let's talk.</span>
          </h2>
          <p class="mt-8 max-w-md font-display text-base leading-relaxed text-bone/70">
            Building a product, validating an idea, or just want to compare notes
            on noir lighting? My inbox is open.
          </p>

          <a
            :href="emailHref"
            class="mt-12 inline-flex items-center gap-4 border-b border-bone/30 pb-2 font-display text-2xl text-bone transition hover:border-ember hover:text-ember sm:text-3xl"
          >
            {{ emailDisplay }}
            <span>→</span>
          </a>

          <div class="mt-14 flex flex-wrap items-center gap-6">
            <p class="font-mono text-[10px] uppercase tracking-[0.28em] text-ash">
              Elsewhere
            </p>
            <span class="hair text-ash" />
            <div class="flex items-center gap-2">
              <a
                v-for="s in socials"
                :key="s.label"
                :href="s.href"
                :aria-label="s.label"
                class="grid h-11 w-11 place-items-center border border-bone/15 text-bone/70 transition hover:border-ember hover:text-ember"
              >
                <svg
                  class="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  v-html="s.icon"
                />
              </a>
            </div>
          </div>
        </div>

        <!-- right column intentionally empty (3D mailroom) -->
        <div class="hidden lg:col-span-5 lg:block" aria-hidden="true" />
      </div>
    </div>
  </section>
</template>
