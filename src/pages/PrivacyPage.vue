<script setup lang="ts">
import { profile } from '../data/profile'

const year = new Date().getFullYear()
const lastUpdated = 'April 19, 2026'
</script>

<template>
  <div class="min-h-screen bg-char text-bone">
    <!-- Header -->
    <header class="border-b border-bone/10">
      <div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <router-link
          to="/"
          class="font-mono text-[11px] uppercase tracking-[0.2em] text-ash transition hover:text-ember"
        >
          ← Back
        </router-link>
        <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
          {{ profile.name }}
        </span>
      </div>
    </header>

    <!-- Content -->
    <main class="mx-auto max-w-3xl px-6 py-16 md:py-24">
      <h1 class="font-display text-3xl font-medium tracking-tight text-bone md:text-4xl">
        Privacy Policy
      </h1>
      <p class="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-mute">
        Last updated — {{ lastUpdated }}
      </p>

      <div class="mt-12 space-y-10 text-[15px] leading-relaxed text-ash">
        <section>
          <h2 class="mb-4 font-display text-lg font-medium text-bone">Overview</h2>
          <p>
            This website is a personal portfolio for {{ profile.name }}. I respect your
            privacy and aim to be transparent about what data, if any, is collected when
            you visit this site.
          </p>
        </section>

        <section>
          <h2 class="mb-4 font-display text-lg font-medium text-bone">Data Collection</h2>
          <p>
            This website does not collect, store, or process any personal data. There are
            no sign-up forms, user accounts, or databases storing visitor information.
          </p>
        </section>

        <section>
          <h2 class="mb-4 font-display text-lg font-medium text-bone">Cookies</h2>
          <p>
            This site does not use cookies or any client-side storage mechanisms for
            tracking purposes. No first-party or third-party cookies are set.
          </p>
        </section>

        <section>
          <h2 class="mb-4 font-display text-lg font-medium text-bone">Analytics</h2>
          <p>
            This website does not use any analytics or tracking services. No data about
            your visit is collected, stored, or shared with third parties.
          </p>
        </section>

        <section>
          <h2 class="mb-4 font-display text-lg font-medium text-bone">Third-Party Services</h2>
          <p>
            This site is hosted as a static website. External links to platforms such as
            GitHub, LinkedIn, or X (Twitter) are provided for reference. Once you leave
            this site, the respective platform's privacy policy applies.
          </p>
        </section>

        <section>
          <h2 class="mb-4 font-display text-lg font-medium text-bone">Contact</h2>
          <p>
            If you have any questions about this privacy policy, you can reach out at
            <a
              :href="profile.socials.email"
              class="text-ember transition hover:text-ember-2"
            >
              connect.chirag.g@gmail.com</a>.
          </p>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-bone/10">
      <div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-8">
        <div class="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
          <router-link to="/privacy" class="text-bone">Privacy</router-link>
          <span class="opacity-30">·</span>
          <router-link to="/legal" class="hover:text-bone">Legal</router-link>
        </div>
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
          © {{ year }} {{ profile.name }}
        </p>
      </div>
    </footer>
  </div>
</template>
