# Chirag Goel — Portfolio

A scroll-driven, interactive 3D portfolio built with Vue 3, Three.js, and Vite.

**Live:** [haciensus.com](https://haciensus.com)

## Stack

- **Framework:** Vue 3 (Composition API + TypeScript)
- **3D:** Three.js, cannon-es (physics), postprocessing
- **Animation:** GSAP, Lenis (smooth scrolling)
- **Styling:** Tailwind CSS
- **Audio:** Howler.js
- **Build:** Vite
- **Hosting:** Cloudflare Pages

## Getting Started

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name portfolio
```

## Project Structure

```
src/
  components/   # Vue components (Nav, Hero, About, Projects, Contact, Footer)
  pages/        # Route pages (Home, Privacy, Legal)
  three/        # 3D scene, room, characters, effects
  scroll/       # Scroll transitions and Lenis setup
  audio/        # Sound management
  utils/        # GPU detection, parallax, tab animation
  styles/       # Global CSS and theme tokens
  data/         # Profile data
  router/       # Vue Router config
```

## License

All rights reserved. See [Legal](https://haciensus.com/legal).
