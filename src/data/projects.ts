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
]
