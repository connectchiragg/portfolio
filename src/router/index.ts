import { createRouter, createWebHistory } from 'vue-router'

const HomePage = () => import('../pages/HomePage.vue')
const PrivacyPage = () => import('../pages/PrivacyPage.vue')
const LegalPage = () => import('../pages/LegalPage.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/privacy', component: PrivacyPage },
    { path: '/legal', component: LegalPage },
  ],
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth' }
    return { top: 0 }
  },
})

export default router
