<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import Nav from './components/Nav.vue'
import ThreeCanvas from './components/ThreeCanvas.vue'
import HeroSection from './components/HeroSection.vue'
import AboutSection from './components/AboutSection.vue'
import ProjectsSection from './components/ProjectsSection.vue'
import ContactSection from './components/ContactSection.vue'
import Footer from './components/Footer.vue'
import { startAudio, disposeAudio } from './audio/sounds'

// Start audio on first user interaction (browser autoplay policy)
const onFirstInteraction = () => {
  startAudio()
  document.removeEventListener('click', onFirstInteraction)
  document.removeEventListener('keydown', onFirstInteraction)
  document.removeEventListener('scroll', onFirstInteraction)
}

onMounted(() => {
  document.addEventListener('click', onFirstInteraction)
  document.addEventListener('keydown', onFirstInteraction)
  document.addEventListener('scroll', onFirstInteraction)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onFirstInteraction)
  document.removeEventListener('keydown', onFirstInteraction)
  document.removeEventListener('scroll', onFirstInteraction)
  disposeAudio()
})
</script>

<template>
  <ThreeCanvas />
  <Nav />
  <main>
    <HeroSection />
    <AboutSection />
    <ProjectsSection />
    <ContactSection />
  </main>
  <Footer />
</template>
