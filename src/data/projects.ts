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
    tagline: 'Local observability for coding agents',
    desc: 'A live terminal view of context, cost, latency, code changes, tools, compactions, and agents from Claude Code and Codex—without sending session data anywhere.',
    tags: ['Rust', 'Ratatui', 'Open source'],
    href: 'https://aether.haciensus.com',
    screenshot: '/projects/aether.png',
    year: '2026',
  },
]
