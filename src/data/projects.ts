/**
 * Project cards rendered in the Projects section.
 * Dummy data — swap with real projects later by editing this file alone.
 */

export interface Project {
  title: string
  tagline: string
  desc: string
  tags: string[]
  href: string
  /**
   * Tailwind gradient classes used for the card's hero strip.
   * Format: "from-{color} via-{color} to-{color}".
   */
  gradient: string
}

export const projects: Project[] = [
  {
    title: 'Nimbus',
    tagline: 'Realtime collaboration board',
    desc: 'A multiplayer whiteboard with CRDT sync, voice rooms, and infinite canvas.',
    tags: ['Next.js', 'WebRTC', 'Postgres'],
    gradient: 'from-tangerine via-magenta to-grape',
    href: '#',
  },
  {
    title: 'Pulse Pay',
    tagline: 'UPI analytics dashboard',
    desc: 'A merchant analytics tool that turns raw UPI events into actionable insights.',
    tags: ['React', 'Node.js', 'ClickHouse'],
    gradient: 'from-cyan via-grape to-deep',
    href: '#',
  },
  {
    title: 'Asana‑lite',
    tagline: 'Tiny project tracker',
    desc: 'A minimalist task tracker built for indie hackers — no bloat, just focus.',
    tags: ['Astro', 'SQLite', 'HTMX'],
    gradient: 'from-mint via-cyan to-grape',
    href: '#',
  },
  {
    title: 'Lorebook',
    tagline: 'AI worldbuilding tool',
    desc: "A writers' companion that keeps characters and plot threads consistent.",
    tags: ['TypeScript', 'OpenAI', 'Edge'],
    gradient: 'from-magenta via-tangerine to-lemon',
    href: '#',
  },
]
