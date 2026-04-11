<script setup lang="ts">
import Nav from './components/Nav.vue'
import ThreeCanvas from './components/ThreeCanvas.vue'
import HeroSection from './components/HeroSection.vue'
import AboutSection from './components/AboutSection.vue'
import ProjectsSection from './components/ProjectsSection.vue'
import ContactSection from './components/ContactSection.vue'
import Footer from './components/Footer.vue'
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
