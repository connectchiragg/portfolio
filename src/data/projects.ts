/**
 * Project cards rendered in the Projects section.
 * Replace `screenshot` paths and `href` URLs with real values when ready.
 */

export interface Project {
  index: string
  title: string
  tagline: string
  desc: string
  tags: string[]
  href: string
  screenshot: string
  year: string
}

export const projects: Project[] = [
  {
    index: '01',
    title: 'Nimbus',
    tagline: 'Realtime collaboration board',
    desc: 'Multiplayer whiteboard with CRDT sync, voice rooms, and an infinite canvas built for design crits.',
    tags: ['Next.js', 'WebRTC', 'Postgres'],
    href: '#',
    screenshot: '/projects/nimbus.svg',
    year: '2025',
  },
  {
    index: '02',
    title: 'Pulse Pay',
    tagline: 'UPI analytics dashboard',
    desc: 'Merchant analytics that turns raw UPI events into actionable cohorts and revenue forecasts.',
    tags: ['React', 'Node.js', 'ClickHouse'],
    href: '#',
    screenshot: '/projects/pulse-pay.svg',
    year: '2024',
  },
  {
    index: '03',
    title: 'Asana-lite',
    tagline: 'Tiny project tracker',
    desc: 'Minimalist task tracker for indie hackers — no bloat, just focus and a single keyboard shortcut.',
    tags: ['Astro', 'SQLite', 'HTMX'],
    href: '#',
    screenshot: '/projects/asana-lite.svg',
    year: '2024',
  },
  {
    index: '04',
    title: 'Lorebook',
    tagline: 'AI worldbuilding tool',
    desc: 'A writers\' companion that keeps characters, factions and plot threads consistent across drafts.',
    tags: ['TypeScript', 'OpenAI', 'Edge'],
    href: '#',
    screenshot: '/projects/lorebook.svg',
    year: '2026',
  },
]
