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
  role: 'Founding Engineer · Applied AI',
  location: 'Bengaluru, India',
  available: true,
  bio: 'Leads an enterprise-grade Voice AI platform generating multi-million-dollar ARR and handling thousands of calls per minute.',
  skills: [
    'Voice AI & Conversational AI',
    'Agentic Systems, RAG & Evals',
    'Python, Java, SQL, C++ & Bash',
    'LangGraph, Spring Boot & Flask',
    'Kafka, Airflow, Redshift & Snowflake',
    'Postgres, Redis & Elasticsearch',
    'AWS, Docker, CI/CD & Observability',
  ],
  socials: {
    email: 'mailto:connect.chirag.g@gmail.com',
    github: 'https://github.com/connectchiragg',
    linkedin: 'https://www.linkedin.com/in/connectchiragg',
    x: 'https://x.com/haciensus',
  },
}
