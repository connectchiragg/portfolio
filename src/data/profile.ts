/**
 * Single source of truth for the profile content rendered in HTML overlays.
 * Edit this file to swap dummy → real data later. No component code touches.
 */

export interface Profile {
  name: string
  role: string
  location: string
  available: boolean
  bio: string
  skills: string[]
  socials: {
    email: string
    github: string
    linkedin: string
    x: string
  }
}

export const profile: Profile = {
  name: 'Chirag Goel',
  role: 'Full‑Stack Developer',
  location: 'Bengaluru, India',
  available: true,
  bio: 'Designs and builds full‑stack web products end to end. Comfortable in databases, on the canvas, and at 2am with a half‑empty mug.',
  skills: [
    'TypeScript & Node.js',
    'Vue, Nuxt, Astro',
    'React & Next.js',
    'PostgreSQL & Redis',
    'Docker & Kubernetes',
    'AWS / GCP',
    'System Design',
  ],
  socials: {
    email: 'mailto:hello@chiraggoel.dev',
    github: 'https://github.com/chiraggoel',
    linkedin: 'https://linkedin.com/in/chiraggoel',
    x: 'https://x.com/chiraggoel',
  },
}
