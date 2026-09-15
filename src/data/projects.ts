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
    title: 'Aether',
    tagline: 'Live observability for coding agents',
    desc: 'An open-source Rust terminal UI for Claude Code and Codex sessions—surfacing tokens, costs, tools, sub-agents, and quality signals without sending session data anywhere.',
    tags: ['Rust', 'Ratatui', 'Open source'],
    href: 'https://aether.haciensus.com',
    screenshot: '/projects/aether.png',
    year: '2026',
  },
  {
    index: '02',
    title: 'Framer',
    tagline: 'Find the moment in your videos',
    desc: 'A video library you can search in plain language. AI-generated tags and summaries connect each result to a supporting frame, so you can jump straight to the moment.',
    tags: ['Python', 'Video AI', 'PostgreSQL'],
    href: 'https://framer.haciensus.com',
    screenshot: '/projects/framer.png',
    year: '2026',
  },
]
