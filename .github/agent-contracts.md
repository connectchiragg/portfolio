# Agent Contracts

This file tells parallel worker agents which files they own, which files they read but cannot write, and what acceptance criteria they must hit before merging.

The orchestrator (the human-driving session) is the only one allowed to spawn agents and merge worktrees. **Workers do not spawn sub-agents.**

All shared module signatures live in `src/three/contracts.d.ts`. Workers may implement those interfaces but must not change the signatures without orchestrator approval.

---

## Phase 1 — Foundation (3 workers in parallel)

### W1: Three core

**Owns** (write):
- `src/three/Scene.ts`
- `src/three/Loader.ts`
- `src/three/lights.ts`

**Reads** (no write):
- `src/three/contracts.d.ts`
- `package.json` (for installed three version)

**Acceptance:**
- `npm run build` clean
- `npx vue-tsc --noEmit` clean
- Renders an empty scene with one placeholder cube and basic lighting (verified by W2 spinning up the dev server with W1's code)
- Disposes cleanly on unmount (no GPU memory leaks)
- KTX2 + Draco loaders wired with `/draco/` and `/basis/` paths

### W2: Vue shell

**Owns** (write):
- `src/App.vue`
- `src/main.ts`
- `src/components/ThreeCanvas.vue`
- `src/components/Nav.vue`
- `src/components/HeroSection.vue`
- `src/components/AboutSection.vue`
- `src/components/ProjectsSection.vue`
- `src/components/ContactSection.vue`
- `src/components/Footer.vue`
- `src/components/MuteToggle.vue`
- `index.html`

**Reads** (no write):
- `src/three/contracts.d.ts`
- `src/data/profile.ts`
- `src/data/projects.ts`
- `src/styles/global.css`

**Acceptance:**
- Page renders all section text without 3D content
- Sticky pill nav scrolls to anchors smoothly
- ResizeObserver attached to ThreeCanvas
- No 3D logic — only mounts the contract via `createScene()`

### W3: Scroll layer

**Owns** (write):
- `src/scroll/lenis.ts`
- `src/scroll/timeline.ts` (skeleton only — single test pin, no scene wiring)

**Reads** (no write):
- `src/three/contracts.d.ts`

**Acceptance:**
- Lenis ↔ GSAP ticker bridge wired exactly per the plan
- One test ScrollTrigger pin proves the setup works
- `createScroll()` exposed per contract
- `createTimeline().build()` is a no-op stub

### Reviewer R1 (Plan agent, read-only)

After all three workers return, R1:
1. Runs `npm run build` and `vue-tsc --noEmit`
2. Reads each diff for contract violations and out-of-slice writes
3. Returns a structured verdict per worker

If any worker fails review, orchestrator uses `SendMessage` to that worker with R1's findings. Worker amends, R1 re-reviews. Loop until clean.

---

## Phase 2 — Asset acquisition

### Researcher RC1 (Explore agent)

**Task:** Search Quaternius, Poly Pizza, Sketchfab for each asset in the asset checklist (room, desk, laptop, monitor, chair, mug, headphones, lamp, football, straw-hat, manga-stack, crt-tv, succulent, packages, envelopes). Return 3 candidate URLs per slot with license + estimated polycount.

### W4: Asset pipeline

**Owns:**
- `scripts/optimise-models.mjs`

Wraps `gltf-transform` to draco + ktx-compress every GLB in `public/models/`. Idempotent.

**Hard pause:** User creates Avaturn avatar and provides `public/models/character.glb`. Phase 3 cannot start without it.

---

## Phase 3 — Scenes (3 workers in parallel)

### W5: Hero room

**Owns:**
- `src/three/room/Room.ts`
- `src/three/room/DeskMonitor.ts`

**Reads:**
- `src/three/contracts.d.ts`
- `src/three/Scene.ts`, `src/three/Loader.ts`, `src/three/lights.ts`

**Acceptance:** Hero scene renders with desk, props, mug, headphones, football, straw hat, jersey on corkboard (using cloth shader), succulent on shelf. All props named so easter eggs can find them via `getHitMesh()`.

### W6: Hologram about

**Owns:**
- `src/three/characters/Hologram.ts`
- `src/three/shaders/hologram.frag.glsl`
- `src/three/shaders/hologram.vert.glsl`

**Reads:**
- contracts
- W7's `Avatar.ts` (to wrap it)

**Acceptance:** Hologram shader renders with scan line + fresnel rim + dotted grid floor. AnalyserNode hookup works.

### W7: Avatar + contact mailroom

**Owns:**
- `src/three/characters/Avatar.ts`
- contact scene assembly inside `src/three/room/Room.ts` (extends W5's room)

**Reads:**
- contracts
- `public/models/character.glb` (user-provided)

**Acceptance:** Avatar loads from Avaturn glb, idle mixer plays, head-tracks cursor, jersey re-texture applied (sky blue + white stripes, "CHIRAG" + "10" on back, no logos). Contact scene has packages + envelopes + avatar standing.

### Reviewer R2 (Plan agent)

Reviews each in isolation. Build clean, screenshots match expected layout (Playwright), no console errors.

---

## Phase 4 — Animation glue

### W8: Master timeline (sequential)

**Owns:**
- `src/scroll/timeline.ts` (full implementation)
- `src/scroll/transitions/heroToAbout.ts`
- `src/scroll/transitions/aboutToProjects.ts`
- `src/scroll/transitions/projectsToContact.ts`

**Acceptance:** GSAP master timeline tied to scroll. Camera curve through 4 stops. Background colour lerp. Time-of-day lighting. Hero→about particle dissolve transition.

Cannot be parallelised — single timeline file with cross-section dependencies.

---

## Phase 5 — Polish (4 workers in parallel)

### W9: Postprocessing + visual effects

**Owns:**
- `src/three/effects/composer.ts`
- `src/three/effects/godRays.ts`
- `src/three/effects/customCursor.ts`
- `src/three/shaders/cloth-wave.glsl`
- `src/three/shaders/speed-lines.glsl`

### W10: Audio

**Owns:**
- `src/audio/sounds.ts`
- `src/audio/crossfade.ts`
- `src/audio/analyser.ts`
- wires `src/components/MuteToggle.vue` (W2's file — coordinate via small interface change)

### W11: Easter eggs

**Owns:**
- `src/three/easter-eggs/*` (all of them)

### W12: Personalisation

**Owns:**
- `src/utils/geoip.ts`
- `src/utils/localClock.ts`
- `src/utils/prefersReducedMotion.ts`
- `src/utils/gpu.ts`

### Reviewer R4 (Plan agent)

Reviews all four together against the merged main branch.

---

## Phase 6 — QA + verification

### R5 (general-purpose)

Runs the full Verification plan. Returns a single pass/fail report.
