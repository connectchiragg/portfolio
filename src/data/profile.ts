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
  role: 'Fullstack Developer',
  location: 'Bangalore, India',
  available: true,
  bio: 'Builds scalable backend systems, data pipelines, and cloud infrastructure. IIT BHU grad. Comfortable in databases, on the terminal, and at 2am with a half‑empty mug.',
  skills: [
    'Java & Spring Boot',
    'Python & Flask',
    'PostgreSQL & Redis',
    'Kafka & Airflow',
    'Docker & Terraform',
    'AWS (S3, SQS, Lambda, ECS)',
    'System Design',
  ],
  socials: {
    email: 'mailto:connect.chirag.g@gmail.com',
    github: 'https://github.com/connectchiragg',
    linkedin: 'https://www.linkedin.com/in/connectchiragg',
    x: 'https://x.com/haciensus',
  },
}
