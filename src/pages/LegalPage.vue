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
        Legal Notice
      </h1>
      <p class="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-mute">
        Last updated — {{ lastUpdated }}
      </p>

      <div class="mt-12 space-y-10 text-[15px] leading-relaxed text-ash">
        <section>
          <h2 class="mb-4 font-display text-lg font-medium text-bone">Site Owner</h2>
          <p>
            {{ profile.name }}<br />
            {{ profile.role }}<br />
            {{ profile.location }}
          </p>
          <p class="mt-3">
            Contact:
            <a
              :href="profile.socials.email"
              class="text-ember transition hover:text-ember-2"
            >
              connect.chirag.g@gmail.com</a>
          </p>
        </section>

        <section>
          <h2 class="mb-4 font-display text-lg font-medium text-bone">Copyright</h2>
          <p>
            © {{ year }} {{ profile.name }}. All content on this website — including text,
            graphics, 3D models, animations, and source code — is the intellectual property
            of {{ profile.name }} unless otherwise stated. Unauthorized reproduction or
            distribution of this material is prohibited.
          </p>
        </section>

        <section>
          <h2 class="mb-4 font-display text-lg font-medium text-bone">Disclaimer</h2>
          <p>
            This website is provided on an "as is" basis. While reasonable effort is made to
            ensure the accuracy of the information presented, no warranties or guarantees are
            made regarding completeness, reliability, or suitability for any purpose. Use of
            this site is at your own risk.
          </p>
        </section>

        <section>
          <h2 class="mb-4 font-display text-lg font-medium text-bone">External Links</h2>
          <p>
            This site contains links to third-party websites (GitHub, LinkedIn, X). These
            links are provided for convenience and do not signify endorsement. I am not
            responsible for the content, privacy practices, or availability of linked sites.
          </p>
        </section>

        <section>
          <h2 class="mb-4 font-display text-lg font-medium text-bone">Liability</h2>
          <p>
            To the fullest extent permitted by law, {{ profile.name }} shall not be held
            liable for any damages arising from the use of or inability to use this website,
            including but not limited to direct, indirect, incidental, or consequential damages.
          </p>
        </section>

        <section>
          <h2 class="mb-4 font-display text-lg font-medium text-bone">Governing Law</h2>
          <p>
            Any disputes arising from the use of this website shall be governed by the laws
            of India and subject to the jurisdiction of courts in Bangalore, Karnataka.
          </p>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-bone/10">
      <div class="mx-auto flex max-w-3xl items-center justify-between px-6 py-8">
        <div class="flex items-center gap-6 font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
          <router-link to="/privacy" class="hover:text-bone">Privacy</router-link>
          <span class="opacity-30">·</span>
          <router-link to="/legal" class="text-bone">Legal</router-link>
        </div>
        <p class="font-mono text-[10px] uppercase tracking-[0.2em] text-mute">
          © {{ year }} {{ profile.name }}
        </p>
      </div>
    </footer>
  </div>
</template>
