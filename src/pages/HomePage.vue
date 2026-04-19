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

const progress = ref(0)
const loaded = ref(false)
const started = ref(false)

const onProgress = (v: number) => {
  progress.value = v
}

const onReady = () => {
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
    <div v-if="!started" class="loading-screen">
      <div class="loading-content">
        <p class="loading-subtitle">Portfolio</p>
        <h1 class="loading-title">Late Night, Bengaluru</h1>
        <div v-if="!loaded" class="progress-track">
          <div class="progress-fill" :style="{ width: progress * 100 + '%' }" />
        </div>
        <p v-if="!loaded" class="progress-text">{{ Math.round(progress * 100) }}%</p>
        <button v-else class="start-btn" @click="start">
          Start Experience
        </button>
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
  background: #060a26;
  overflow: hidden;
  touch-action: none;
  overscroll-behavior: none;
}

.loading-content {
  text-align: center;
  color: #e8e6e3;
  font-family: 'Space Grotesk', sans-serif;
}

.loading-subtitle {
  font-size: 0.75rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: #4ad8ff;
  margin-bottom: 0.5rem;
}

.loading-title {
  font-size: clamp(1.5rem, 4vw, 2.5rem);
  font-weight: 500;
  margin: 0 0 2.5rem;
  letter-spacing: -0.02em;
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
  background: #4ad8ff;
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
  border: 1px solid rgba(74, 216, 255, 0.4);
  background: transparent;
  color: #4ad8ff;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.9rem;
  letter-spacing: 0.1em;
  padding: 0.75rem 2rem;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-btn:hover {
  background: rgba(74, 216, 255, 0.08);
  border-color: #4ad8ff;
  box-shadow: 0 0 20px rgba(74, 216, 255, 0.15);
}

/* Transition for the loading screen exit */
.loader-fade-leave-active {
  transition: opacity 0.8s ease;
}
.loader-fade-leave-to {
  opacity: 0;
}
</style>
