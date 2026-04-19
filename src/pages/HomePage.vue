<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import Nav from '../components/Nav.vue'
import ThreeCanvas from '../components/ThreeCanvas.vue'
import HeroSection from '../components/HeroSection.vue'
import AboutSection from '../components/AboutSection.vue'
import ProjectsSection from '../components/ProjectsSection.vue'
import ContactSection from '../components/ContactSection.vue'
import Footer from '../components/Footer.vue'
import { startAudio, disposeAudio } from '../audio/sounds'
import { startTabAnimation, stopTabAnimation } from '../utils/tabAnimation'
import { getTimeSlot, fetchRegion } from '../utils/timeSlot'

const { label: timeLabel, sky } = getTimeSlot()
const region = ref('')
const progress = ref(0)
const loaded = ref(false)
const started = ref(false)

const onProgress = (v: number) => {
  progress.value = v
}

const onReady = async () => {
  // Fetch region at 100% — fast API call, models already loaded
  const detected = await fetchRegion()
  region.value = detected ?? 'India'
  loaded.value = true
}

const start = () => {
  window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  started.value = true
  unlockScroll()
  startAudio()
  startTabAnimation()
}

const lockScroll = () => {
  document.documentElement.style.overflow = 'hidden'
  document.body.style.overflow = 'hidden'
}
const unlockScroll = () => {
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
}

onMounted(() => {
  lockScroll()
})

onBeforeUnmount(() => {
  unlockScroll()
  disposeAudio()
  stopTabAnimation()
})
</script>

<template>
  <!-- Loading screen -->
  <Transition name="loader-fade">
    <div
      v-if="!started"
      class="loading-screen"
      :style="{
        background: `linear-gradient(to bottom, ${sky.top}, ${sky.mid}, ${sky.bot})`,
        '--sky-accent': sky.bot,
        '--sky-accent-dim': sky.mid,
      } as any"
    >
      <div class="loading-content">
        <div v-if="!loaded" class="progress-section">
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: progress * 100 + '%' }" />
          </div>
          <p class="progress-text">{{ Math.round(progress * 100) }}%</p>
        </div>
        <Transition name="fade-in">
          <div v-if="loaded" class="ready-section">
            <p class="loading-location">{{ timeLabel }}, {{ region }}</p>
            <h1 class="loading-title">Chirag's Portfolio</h1>
            <button class="start-btn" @click="start">
              Start Experience
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </Transition>

  <ThreeCanvas @progress="onProgress" @ready="onReady" />
  <Nav :visible="started" />
  <main>
    <HeroSection />
    <AboutSection />
    <ProjectsSection />
    <ContactSection />
  </main>
  <Footer />
</template>

<style scoped>
.loading-screen {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  touch-action: none;
  overscroll-behavior: none;
}

.loading-content {
  text-align: center;
  font-family: 'Space Grotesk', sans-serif;
}

.loading-location {
  font-size: 0.75rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--sky-accent, #4ad8ff);
  margin-bottom: 0.75rem;
}

.loading-title {
  font-size: clamp(1.8rem, 5vw, 3rem);
  font-weight: 500;
  margin: 0 0 2.5rem;
  letter-spacing: -0.02em;
  color: #ffffff;
}

.progress-track {
  width: 200px;
  height: 2px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 1px;
  margin: 0 auto 1rem;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--sky-accent, #4ad8ff);
  border-radius: 1px;
  transition: width 0.3s ease;
}

.progress-text {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.4);
  margin: 0;
}

.start-btn {
  appearance: none;
  border: 1px solid var(--sky-accent, rgba(74, 216, 255, 0.4));
  background: transparent;
  color: var(--sky-accent, #4ad8ff);
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  padding: 0.75rem 2rem;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--sky-accent, #4ad8ff);
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
}

/* Transition for the loading screen exit */
.loader-fade-leave-active {
  transition: opacity 0.8s ease;
}
.loader-fade-leave-to {
  opacity: 0;
}

/* Fade-in for location text */
.fade-in-enter-active {
  transition: opacity 0.6s ease;
}
.fade-in-enter-from {
  opacity: 0;
}
</style>
