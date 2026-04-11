# CONTEXT — Late Night, Bengaluru

> Pre‑compact handoff doc. Written so a future Claude session (or returning Chirag) can pick up the project after the conversation context is lost. Read this front‑to‑back before touching anything.

---

## 1. Mission

Build Chirag Goel's personal portfolio at `/Users/omen/portfolio` to match the production quality of [david-hckh.com](https://david-hckh.com): a single‑page, scroll‑driven 3D experience where a persistent WebGL canvas reacts to scroll, sections cross‑fade, ambient audio plays, and the user feels like they're moving through a "Late Night, Bengaluru" cinematic.

Chirag is a backend developer in Bengaluru. He explicitly delegated all visual/creative decisions ("go wild") with three hard constraints:
- **Avatar wearing Argentina #10 jersey** (sky blue + white vertical stripes, "CHIRAG" + "10" on the back, no AFA crest, no manufacturer mark)
- **Anime + football personality elements** (straw hat on the wall, manga stack, sakura, football beside the chair)
- **Late‑night vintage jazz audio** (two‑track cross‑fade)

He's currently away. The autonomous agent build proceeded through phases 0–6 in his absence and we're in handoff territory.

---

## 2. Status snapshot

**Working dir**: `/Users/omen/portfolio`
**Old Astro version archived at**: `/Users/omen/portfolio-astro-v1`
**Master plan**: `/Users/omen/.claude/plans/noble-painting-coral.md`
**Asset shortlist**: `docs/asset-shortlist.md` (RC1's research)
**Known issues**: `docs/known-issues.md`
**This doc**: `docs/CONTEXT.md`

**What works end‑to‑end** (verified via Playwright at the time of last commit):
- Hero scene: primitive avatar in Argentina jersey at the desk, warm lamp + real‑time shadows, moonlit window, corkboard with the jersey, football, green mug with steam, manga stack, CRT TV, succulent on shelf, headphones on desk
- About scene: cyan GLSL hologram figure with scan lines + fresnel rim + dotted grid floor + audio‑reactive brightness pulse
- Projects scene: avatar standing, room visible, four project cards as HTML overlay
- Contact scene: mailroom with cardboard boxes + sunrise window
- Sticky pill nav, mute toggle, scroll‑driven master GSAP timeline through 4 camera stops with Lenis smooth scroll
- Postprocessing: bloom, vignette, film grain, chromatic aberration (gated to GPU tier ≥2 + non‑mobile + non‑reduced‑motion)
- God rays, sakura particle field, custom DOM cursor with mix‑blend‑mode difference, mouse parallax, geo‑IP greeting helper, local clock canvas texture
- 8 easter eggs wired (straw hat lift, football kick with cannon‑es lazy chunk, headphones, manga book, lamp toggle, mug steam puff, konami code, idle stretch)
- Audio system (Howler + WebAudio analyser tap into the hologram) — silent because no audio files exist yet but loads cleanly

**Latest commit**: `aeb7ada fix: make HTML section overlays translucent so the canvas shows through`

**Build state**: clean (`npm run build` exits 0, `vue-tsc --noEmit -p tsconfig.app.json` clean, 0 console errors / 0 warnings, dist 3.8 MB).

---

## 3. Stack

| Layer | Library | Version (locked) | Why |
|---|---|---|---|
| Build | **Vite** | 8.0.4 | Same as the reference site, fast HMR, KTX2/Draco friendly |
| Framework | **Vue 3** | 3.5.32 | Mirrors david‑hckh's stack (verified by inspecting his bundle: `createApp` + `defineComponent` substring matches) |
| Type checking | **TypeScript** + **vue‑tsc** | 6.x / 3.2.6 | strict mode + erasableSyntaxOnly |
| 3D | **three** | 0.183.2 | Raw three (NOT react‑three‑fiber, since this is Vue) |
| Loaders | **GLTFLoader** + **DRACOLoader** + **KTX2Loader** + **MeshoptDecoder** | bundled with three | Standard GLB pipeline. Decoder files mirrored to `public/draco/` and `public/basis/` by `scripts/copy-decoders.mjs` (postinstall) |
| Postprocessing | **postprocessing** (pmndrs) | 6.39.0 | Bloom, vignette, grain, chromatic aberration, more flexible than three's built-in EffectComposer |
| GPU detection | **detect-gpu** (pmndrs) | 5.0.70 | Low‑end fallback gating |
| Scroll animation | **gsap** + **ScrollTrigger** | 3.14.2 | Free as of 2025 (Webflow acquisition), industry standard |
| Smooth scroll | **lenis** | 1.3.21 | Buttery scroll bridged into GSAP's ticker |
| Audio | **howler** + **@types/howler** | 2.2.4 | Two‑track cross‑fade + WebAudio analyser tap on `Howler.masterGain` |
| Physics | **cannon-es** | 0.20.0 | Football easter egg only — lazy‑loaded into its own 80 kB chunk |
| Styling | **Tailwind CSS v4** + `@tailwindcss/vite` | 4.x | `@theme` token block in `src/styles/global.css` |
| Shaders | **vite-plugin-glsl** | 1.6.0 | Lets us write `.glsl` files and import them as strings |
| Fonts | Space Grotesk + JetBrains Mono | Google Fonts | Loaded via `<link>` in `index.html` |
| Asset optimisation | **@gltf-transform/{core,extensions,functions,cli}** | 4.3.0 | `npm run optimise:models` runs Draco + KTX2 + weld + dedup + prune over `public/models/*.glb` |

---

## 4. Architecture: persistent canvas + scroll‑pinned timeline

**This is the single most important pattern.** It's what makes david‑hckh's site feel "3D throughout" instead of "3D embeds glued to a page".

```
┌─────────────────────────────────────────┐
│  Fixed full-viewport <canvas> (z=0)     │  ← Three.js renderer, always visible
├─────────────────────────────────────────┤
│  HTML overlays scroll on top (z=10)     │  ← Vue components, sections stack
│                                         │
│  Sections use translucent gradient      │
│  backgrounds so the canvas peeks        │
│  through where the 3D content lives.    │
└─────────────────────────────────────────┘
```

- A single `ThreeCanvas.vue` component owns the WebGL canvas + Three.js renderer.
- All 3D objects (room, desk, character, props, hologram, packages) live in the same `THREE.Scene`. The master GSAP timeline drives camera position + lookAt + scene background + light intensities + shader uniforms + visibility flags.
- **Lenis** owns smooth scroll. We forward Lenis scroll → ScrollTrigger.update via `gsap.ticker.add((time) => lenis.raf(time * 1000))`. **All three pieces of the bridge are required**:
  ```ts
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  ```
- HTML section components scroll on top of the canvas. Their backgrounds are now **translucent** (e.g. `linear-gradient(to right, rgba(255, 245, 233, 0.92) 0%, rgba(255, 245, 233, 0) 65%, rgba(255, 245, 233, 0) 100%)`) so the canvas shows through where the 3D content visually lives.
- **`body { background: transparent }`** in `src/styles/global.css` is critical — without this, the body covers the canvas entirely.

### Visibility state machine

The 3D scenes are NOT toggled via the scrubbed master timeline (because GSAP's `tl.call` fires symmetrically on forward AND reverse passes, making coherent state impossible across scroll directions). Instead, **per‑section ScrollTriggers** with `onEnter`/`onEnterBack`/`onLeaveBack` callbacks set named state functions:

```ts
const setHeroState = () => {
  room.root.visible = true
  avatar.root.visible = true
  avatar.root.position.set(0, 0, -0.6)
  avatar.play('sitting')
  hologram.root.visible = false
  mailroom.visible = false
}
// ...setAboutState, setProjectsState, setContactState
```

These live in `src/scroll/timeline.ts` inside `build()`.

### Two avatars

There are TWO `Avatar` instances. The `createHologram(avatar)` API **re‑parents** the avatar root into the hologram group (so it can swap materials). With a single avatar instance, you'd get either-the-chair-OR-the-hologram, not both. The fix: load `loadAvatar()` twice — one stays in the room and teleports between chair/mailroom positions; the other is owned by the hologram and never moves. They're primitive humanoids built from `BoxGeometry` + `SphereGeometry`, so two of them is essentially free.

---

## 5. File layout (current state)

```
portfolio/
├── package.json                       # vite + vue + ts + tailwind4 + three stack
├── vite.config.ts                     # tailwind + glsl plugins, host: 127.0.0.1
├── tsconfig.{json,app.json,node.json}
├── scripts/
│   ├── copy-decoders.mjs              # postinstall: mirrors three's draco + basis decoders
│   └── optimise-models.mjs            # `npm run optimise:models` — gltf-transform pipeline
├── public/
│   ├── favicon.svg                    # Vite scaffold default (purple lightning)
│   ├── icons.svg                      # Vite scaffold default
│   ├── draco/                         # gitignored, regenerated by postinstall
│   ├── basis/                         # gitignored, regenerated by postinstall
│   ├── models/                        # ← USER PROVIDES character.glb here
│   ├── textures/                      # (empty)
│   └── audio/                         # ← USER PROVIDES jazz tracks + cues here
├── docs/
│   ├── asset-shortlist.md             # RC1's CC0 GLB research (16 prop slots)
│   ├── known-issues.md                # R5's pass + things waiting on user
│   └── CONTEXT.md                     # ← THIS FILE
├── .github/
│   └── agent-contracts.md             # Phase 1+ worker file ownership map
└── src/
    ├── main.ts                        # createApp + global.css import
    ├── App.vue                        # mounts Nav, ThreeCanvas, sections, Footer
    ├── styles/
    │   └── global.css                 # @theme tokens, .three-canvas positioning
    ├── data/                          # ← single source of truth, swap dummy → real here
    │   ├── profile.ts                 # name, role, location, bio, skills, socials
    │   └── projects.ts                # 4 dummy projects: Nimbus / Pulse Pay / Asana-lite / Lorebook
    ├── three/
    │   ├── contracts.d.ts             # ← canonical interface contracts (DON'T break signatures)
    │   ├── Scene.ts                   # createScene + setRenderer override hook
    │   ├── Loader.ts                  # GLTF + DRACO + KTX2 + Meshopt
    │   ├── lights.ts                  # createRoomLights + setTimeOfDay(t)
    │   ├── characters/
    │   │   ├── Avatar.ts              # primitive humanoid in jersey + 4 poses
    │   │   └── Hologram.ts            # cyan ShaderMaterial wrapping an Avatar root
    │   ├── room/
    │   │   ├── Room.ts                # 716-line primitive bedroom (every prop a labelled function)
    │   │   ├── DeskMonitor.ts         # CanvasTexture rendering scrolling fake code lines
    │   │   └── Mailroom.ts            # contact-section primitive scene
    │   ├── shaders/
    │   │   ├── hologram.frag.glsl     # fresnel rim + scan lines + audio reactive
    │   │   ├── hologram.vert.glsl
    │   │   ├── cloth-wave.glsl        # vertex displacement (paired w/ a basic frag externally)
    │   │   └── speed-lines.glsl       # radial anime speed lines overlay
    │   ├── effects/
    │   │   ├── composer.ts            # postprocessing EffectComposer with toggleable passes
    │   │   ├── godRays.ts             # 5 additive translucent slabs from the window
    │   │   ├── customCursor.ts        # DOM cursor with trailing tail + mix-blend-mode difference
    │   │   └── sakuraField.ts         # 150-petal Points object with sin sway
    │   └── easter-eggs/
    │       ├── index.ts               # mountEasterEggs + raycaster dispatch
    │       ├── strawHat.ts
    │       ├── football.ts            # cannon-es lazy import
    │       ├── headphones.ts
    │       ├── mangaStack.ts
    │       ├── lamp.ts
    │       ├── mug.ts
    │       ├── konami.ts
    │       └── idleStretch.ts
    ├── scroll/
    │   ├── lenis.ts                   # createScroll() — Lenis ↔ GSAP bridge
    │   ├── timeline.ts                # createTimeline() — master scrubbed timeline + per-section state machine
    │   └── transitions/
    │       ├── heroToAbout.ts
    │       ├── aboutToProjects.ts
    │       └── projectsToContact.ts
    ├── audio/
    │   ├── sounds.ts                  # createAudio() — Howler tracks + cues + masterGain analyser tap
    │   ├── crossfade.ts               # rAF linear volume tween
    │   └── analyser.ts                # bassLevel(node) helper
    ├── utils/
    │   ├── geoip.ts                   # ipapi.co fetch with 24h localStorage cache
    │   ├── localClock.ts              # createClockTexture() — 256x64 HH:MM canvas texture
    │   ├── prefersReducedMotion.ts
    │   ├── gpu.ts                     # detectGpuTier() wrapping detect-gpu
    │   └── parallax.ts                # mountMouseParallax(camera) — additive ±3° rotation
    └── components/
        ├── ThreeCanvas.vue            # ← orchestrator: instantiates everything, wires ticks
        ├── Nav.vue                    # sticky pill (CG logo + About/Projects/Contact + tangerine CTA + MuteToggle)
        ├── HeroSection.vue            # transparent gradient bg, text on left, canvas peeks through right
        ├── AboutSection.vue           # transparent dark wash, callouts on sides, hologram in centre
        ├── ProjectsSection.vue        # transparent cream wash, 4 project cards
        ├── ContactSection.vue         # transparent cream-2 gradient, text + socials + email CTA
        ├── Footer.vue                 # 0.85 alpha cream wash, back-to-top, copyright, "Built between innings"
        └── MuteToggle.vue              # speaker icon, persists muted state to localStorage, emits 'change'
```

### `src/three/contracts.d.ts` is the source of truth for module interfaces

Workers (and you) should code against the contracts. The current shapes are:
- `SceneContext` — renderer, scene, camera, onTick, resize, dispose, **setRenderer** (composer override)
- `Loader` — load(url) → { scene, animations }, dispose
- `RoomLights` — deskLamp / moonlight / sunrise / ambient + attach + setTimeOfDay
- `Avatar` — root, mixer, play(pose), lookAt(x,y,z), applyJersey, **tick?** (optional), dispose
- `Hologram` — root, bindAnalyser, setReveal, **tick?**, dispose
- `Room` — root, props (RoomProps), getHitMesh, **tick?**, dispose
- `Composer` — render(dt), setSize, setPasses, dispose
- `AudioController` — begin, to, setMuted, isMuted, cue, getAnalyser, dispose
- `ScrollContext` — lenis, progress(), onTick(cb)
- `MasterTimeline` — build({ sceneCtx, room, avatar, hologram, lights, mailroom }), dispose

The optional `tick?` methods on Avatar/Hologram/Room are how those modules get per‑frame updates — the orchestrator wires them into `sceneCtx.onTick` after construction.

---

## 6. Decisions made (and why)

| Decision | Why |
|---|---|
| **Vue 3 + Vite** instead of Astro/React/Next | Mirrors david-hckh's actual stack (verified by inspecting his bundle for `createApp` + `defineComponent`). Astro v1 had been built earlier but couldn't host the persistent canvas pattern as cleanly. |
| **Primitive geometry** instead of GLB models | Asset acquisition is a high‑friction long pole when the user is away (Sketchfab needs auth, FBX→GLB conversion, etc.). Plan B from the master plan's "Risks" section. The room/avatar/mailroom are now built from `BoxGeometry`/`CylinderGeometry`/`SphereGeometry` etc., each in a `// PRIMITIVE: <slot>` labelled function so individual props can be swapped to GLBs later via `docs/asset-shortlist.md`. |
| **Two avatars** (real + hologram-owned) | `createHologram(avatar)` re‑parents the avatar into the hologram group — having a single instance forces you to choose between the chair or the hologram. Two primitive humanoids is essentially free. |
| **Per-section ScrollTriggers** for visibility, NOT scrubbed `tl.call` | GSAP's scrubbed timeline `tl.call` fires symmetrically on forward AND reverse — impossible to keep visibility coherent across scroll directions. Per-section ScrollTrigger.create with `onEnter`/`onLeaveBack` is direction‑aware. |
| **Translucent section backgrounds** | The biggest visual fix. Originally every section had `bg-cream` / `bg-deep` etc. — opaque, completely covering the canvas. Now each section uses a `linear-gradient` with `rgba(...)` alpha so the canvas peeks through where the 3D content lives, while the text side stays opaque enough to be readable. The placeholder cards on the right column of hero/contact were deleted entirely. |
| **`body { background: transparent }`** | Otherwise the body covers the canvas. Canvas is `position: fixed; inset: 0; z-index: 0` and the body's default background would obscure it. |
| **Avaturn for the avatar GLB** instead of Ready Player Me | RPM shut down public services on 2026‑01‑31 after Netflix acquired the tech. Avaturn is the closest drop-in replacement (browser‑based, free tier, GLB export). |
| **CC0/CC-BY only** for assets | Hard rule. No copyrighted character IP, no brand logos, no trademarked likenesses. |
| **No figurine** in the scene | The user's real Luffy & Shanks figurine is in his office. Originally we considered a photo-plane (legitimate display of his own property), but he confirmed the photo I'd seen was Google-sourced and asked to drop the figurine entirely. The shelf now holds a primitive succulent. |
| **Argentina jersey colours** (sky blue + white stripes + #10 + name "CHIRAG") | Per his explicit choice. **No AFA crest, no Adidas trefoil**. Colours, name, and number are not protected; baked in via per-face material array on the torso BoxGeometry with generated CanvasTexture for the stripes + label. |
| **Postprocessing gated** by `gpuTier >= 2 && !isMobile && !reducedMotion` | iOS Safari tanks fps with bloom + film grain. Low-tier GPUs can't handle multiple fullscreen passes. |
| **`scripts/copy-decoders.mjs` runs as postinstall** | Three's draco + basis decoders are needed at runtime via fetch from `/draco/` and `/basis/`. `public/draco/` and `public/basis/` are gitignored so the script regenerates them on every install. |
| **`@types/howler`** added as devDep | Howler ships no .d.ts. Without `@types/howler` you need a `@ts-expect-error` and a local interface shim. We use both — the @types provides runtime types and the local interfaces document the bits we actually use. |

---

## 7. Bugs I fixed and gotchas worth knowing

### Avatar TDZ (temporal dead zone)
W7's `Avatar.ts` referenced `headTrackingActive` inside `applyJointState` (called immediately after `applyJointState` is defined) but the `let headTrackingActive = false` was declared further down in the same function. JavaScript hoists `let` into the TDZ, so the first call threw `ReferenceError: Cannot access 'headTrackingActive' before initialization`. Fix: move the `let` declaration above `applyJointState`.

### `PCFSoftShadowMap` deprecation
Three.js v0.183 deprecated `PCFSoftShadowMap` in favour of `PCFShadowMap` (which now does soft sampling). Console warns and silently falls back. Fix: import `PCFShadowMap` and use it directly.

### Lenis ↔ GSAP bridge needs ALL THREE pieces
```ts
lenis.on('scroll', ScrollTrigger.update)            // 1
gsap.ticker.add((time) => lenis.raf(time * 1000))   // 2
gsap.ticker.lagSmoothing(0)                          // 3
```
Missing any one means scroll position drifts, lerp feels janky, or ScrollTrigger callbacks fire at the wrong scroll position. **Don't substitute requestAnimationFrame**.

### Master timeline segment durations must match section heights
Naive even quarters (each section gets 25% of scroll) breaks when the projects section is 1653px tall and the others are 700-820px. The timeline needs:
```ts
const T_HERO_HOLD = 0.05
const T_HERO_ABOUT = 0.15
const T_ABOUT_HOLD = 0.05
const T_ABOUT_PROJECTS = 0.15
const T_PROJECTS_HOLD = 0.30   // ← projects gets the largest hold
const T_PROJECTS_CONTACT = 0.15
const T_CONTACT_HOLD = 0.04
const T_CONTACT_FOOTER = 0.04
```
…or refactor to per-section ScrollTriggers each bound to their own anchor. Current implementation uses the tuned-quarters approach.

### `tl.call` is symmetric in scrubbed timelines
GSAP fires `tl.call` callbacks on BOTH forward and reverse scrub passes. So `tl.call(() => { x.visible = false }, [], 0.5)` will fire when scrolling past 0.5 forward AND when scrolling past 0.5 backward. This makes visibility toggles in scrubbed transitions impossible to make coherent. **Solution**: move all visibility toggles into per‑section `ScrollTrigger.create()` with `onEnter`/`onLeaveBack` callbacks, which ARE direction-aware.

### Hologram re-parents the avatar
`createHologram(avatar)` traverses `avatar.root` and replaces every Mesh material with a clone of the hologram material. It also calls `hologramRoot.add(avatar.root)`, which removes the avatar from its previous parent (Three.js Object3D can only have one parent). If the avatar is the same instance you're using in the chair, it gets yanked out of the room. **Fix**: load two avatars, hand one to the hologram.

### Three.js linear-vs-sRGB tone mapping confuses background lerps (KNOWN ISSUE)
`Color('#ffe8cc')` stores values in **linear-sRGB** internally. Tweening `bg.r/.g/.b` directly tweens linear values. Then ACESFilmicToneMapping + sRGB output transforms them, and the result is significantly darker than the visual hex implies. The projects section background doesn't visibly warm to cream-2 because of this. See `docs/known-issues.md` for fix options.

### `setRenderer` override slot on SceneContext
The postprocessing composer can't co-exist with the default `renderer.render(scene, camera)` call inside Scene.ts's `setAnimationLoop` — they'd double-render. Solution: I added a `setRenderer(fn)` method to `SceneContext` that swaps out the internal `renderFn`. The composer installs itself there.

### `body { background: transparent }` is critical
Without this, the body's default cream/white covers the canvas no matter what the section components do. The canvas IS the page background.

### `cannon-es` lazy chunk
The football easter egg's `await import('cannon-es')` produces a separate 80 kB chunk in the build output. This is intentional and proves the dynamic import path works. Don't refactor it to a static import.

### `prefers-reduced-motion` test couldn't be fully verified
Playwright MCP doesn't expose `emulateMedia`. The code path is correct (`enablePostFx = gpuTier >= 2 && !isMobile && !reducedMotion`) but only the "no" branch was tested. Manual verification: Chrome DevTools → Rendering panel → emulate the media feature.

### Vite scaffold's default `favicon.svg` and `icons.svg` are still in `public/`
Harmless — purple lightning bolt favicon. Replace if you want to rebrand.

---

## 8. Phased agent execution model

The build was done by an orchestrator (the Claude session) fanning out work to specialized worker agents in phases. Each worker was a `general-purpose` Agent tool invocation, given a scoped slice of files to write and a specific contract to implement.

### Roles
- **Orchestrator** (the main session): owns the master plan, fans out work, merges, handles user pauses, escalates
- **Worker** (`general-purpose` agent): implements one slice in isolation, reports back when build/lint/types pass
- **Reviewer** (`Plan` agent, read-only): reviews a worker's diff, runs build/Playwright, returns a verdict
- **Researcher** (`Explore` agent, read-only): pulls info from web/codebase

### Coordination rules
- **Worktree isolation didn't work** because the orchestrator's primary cwd was `/Users/omen` which isn't a git repo. The Agent tool's `isolation: "worktree"` option fails when the cwd is outside a git repo. We worked around this by having all workers write directly to `/Users/omen/portfolio` and trusting them to stay in their declared file slices.
- **Workers do NOT commit**. The orchestrator commits each worker's slice with the worker's name as the git author (`-c user.name='W5' -c user.email='w5@worker.local'`) for traceability.
- **Workers do NOT spawn sub-agents**. Flat tree only.
- **Max 4 workers in flight at once**.

### The phases (all done)

| Phase | What | Workers |
|---|---|---|
| 0 | Bootstrap (sequential, orchestrator only) | scaffold Vite + Vue + TS, install deps, write contracts, init git |
| 1 | Foundation (3 parallel) | W1 Three core (Scene/Loader/lights), W2 Vue shell + section components, W3 Lenis + GSAP scroll bridge |
| 2 | Asset acquisition (1 researcher + 1 worker parallel) | RC1 Explore — CC0 GLB shortlist; W4 — gltf-transform optimisation pipeline. **Pivoted to primitive-first** because asset download is high-friction when the user is away. |
| 3 | Scenes (3 parallel) | W5 hero room (Room.ts + DeskMonitor.ts), W6 hologram + GLSL shader, W7 primitive avatar + Mailroom |
| 4 | Master timeline (1 sequential) | W8 — full createTimeline() implementation + 3 transition modules |
| 5 | Polish (4 parallel) | W9 postprocessing/effects/shaders, W10 audio, W11 easter eggs, W12 personalisation utils |
| 6 | QA + verification | R5 (general-purpose) — full Playwright walkthrough + bundle audit + reduced-motion check |

### Commit log shape (use `git log --oneline | head -20`)
```
aeb7ada fix: make HTML section overlays translucent so the canvas shows through
e8358d0 phase 6: R5 verification complete + known-issues handoff doc
a92d277 phase 5 merge: wire postprocessing + audio + easter eggs + parallax + sakura + cursor
5488db1 phase 5 W12: personalisation utilities (geoip + clock + reduced-motion + gpu + parallax)
03897d9 phase 5 W11: easter eggs (hat / football / headphones / manga / lamp / mug / konami / idle stretch)
fafdc9c phase 5 W10: audio (Howler + analyser tap + crossfade)
391233f phase 5 W9: postprocessing composer + visual effects + shaders
52d5332 phase 4: master GSAP scroll timeline + transitions
806a829 phase 3 merge: wire room + avatar + hologram + mailroom into ThreeCanvas
d0201e6 phase 3 W7: primitive avatar + contact mailroom
d498ea6 phase 3 W6: hologram about scene + custom GLSL shader
2cb46c4 phase 3 W5: hero room (primitives) + DeskMonitor canvas texture
69b5c59 phase 2: gltf-transform pipeline + asset shortlist
4b32f83 phase 1 merge: wire ThreeCanvas to createScene + fix shadow map type
08cb874 phase 1 W2: Vue shell + section components
132a4fd phase 1 W3: scroll layer (Lenis + GSAP bridge)
8a27d48 phase 1 W1: Three core (Scene, Loader, lights)
5ab5162 phase 0: scaffold Vite + Vue + TS + Tailwind v4 + Three.js stack
```

`git log --author=W5` (etc.) shows that worker's slice cleanly.

---

## 9. Items waiting on the user (Chirag)

1. **Avatar GLB** — visit [avaturn.me](https://avaturn.me/), generate from a selfie, customise hair/outfit, export as GLB, drop at `public/models/character.glb`. Then change `loadAvatar(ldr, '/models/character.glb')` in `Avatar.ts` to actually use the loader instead of building primitives. Currently the URL is ignored — the function builds primitives regardless.
2. **Late‑night jazz tracks** — pick from [pixabay.com/music/](https://pixabay.com/music/), filter for "lo-fi jazz" / "smooth jazz" / "late night piano". Two tracks (one warm, one cool ambient). Trim each to ~60s loopable, dual-encode mp3+ogg, drop at `public/audio/jazz-warm.{mp3,ogg}` and `public/audio/jazz-cool.{mp3,ogg}`.
3. **Easter egg sound effects** — CC0 click/thud/sting clips from [freesound.org](https://freesound.org/) (filter CC0). Drop at `public/audio/{click,hat-sting,ball-thud,lamp-click}.{mp3,ogg}`.
4. **GLB upgrades (optional)** — `docs/asset-shortlist.md` lists CC0 URLs for any prop you want to upgrade from primitive to a real GLB.
5. **Git identity decision** — local commits use `Chirag Goel <chirag@portfolio.local>`. The SSH key on this machine authenticates as `Chirag289` on GitHub but Chirag mentioned `connectchiragg`. Don't push until this is settled.

---

## 10. Known issues (full detail in `docs/known-issues.md`)

1. **Projects-section background doesn't visibly warm to cream-2** — Three.js linear vs sRGB + ACES tone mapping interaction. Recommended fix: pre-brighten the target hexes in the transition modules so they survive tone mapping.
2. **Reduced-motion path only partially verified** — Playwright MCP can't `emulateMedia`. Code is correct on paper, manual DevTools check needed.
3. **Avatar may show in stretch/celebration pose at scroll 0** — possibly the idle-stretch easter egg firing too eagerly. Check the 30s threshold and rearm logic in `src/three/easter-eggs/idleStretch.ts`.
4. **Live monitor laptop screen code-lines texture not visible** — possibly UV winding or face direction issue. Check `src/three/room/Room.ts`'s laptop builder.
5. **Main bundle 1.05 MB** — within budget but borderline. Lazy-split candidates: hologram shader, GSAP plugins, audio module.

---

## 11. Commands / dev workflow

```bash
cd /Users/omen/portfolio

# Dev
npm run dev                    # vite dev server at http://127.0.0.1:5173/
pkill -f vite                  # stop it

# Build
npm run build                  # vue-tsc -b && vite build → dist/
npx vue-tsc --noEmit -p tsconfig.app.json   # type-check only

# Asset pipeline (when GLBs exist)
npm run optimise:models        # gltf-transform: weld + dedup + prune + draco + ktx2

# Git
git log --oneline | head       # phase commits
git log --author=W5            # filter by worker
git status -s
```

### Playwright workflow for verification

The dev server binds to `127.0.0.1:5173` (NOT localhost — `vite.config.ts` sets `server.host = '127.0.0.1'`).

To screenshot the canvas without HTML covering it:
```js
() => {
  document.querySelector('main').style.opacity = '0'
  document.querySelector('header').style.opacity = '0'
  document.querySelector('footer').style.opacity = '0'
  return 'ok'
}
```
Then wait ~2s and screenshot. Restore opacity by setting it back to `''`.

To scroll programmatically:
```js
() => { window.scrollTo({top: 3258 * 0.30, behavior: 'instant'}); return 'ok' }
```
Note: Lenis intercepts scroll events, so `window.scrollTo` may need to be followed by a wait of ~2s before screenshotting (Lenis lerps to the target position).

### macOS gotcha
The user's `/etc/hosts` was missing `127.0.0.1 localhost` at one point — this broke `npm run build` because Vite tries to resolve localhost. We fixed it earlier by adding the line. If you see `getaddrinfo ENOTFOUND localhost`, that's the cause.

---

## 12. Where I left off + next moves

**Last commit**: `aeb7ada fix: make HTML section overlays translucent so the canvas shows through`

That commit is the resolution of the user's "looks like the old astro site" complaint — every section is now translucent so the canvas peeks through. The user has not yet visually confirmed the fix (they'll need to hard-reload their browser).

**Recommended next moves** in priority order:
1. **Wait for user confirmation** that the translucent fix made the 3D scene visible to them. Don't keep stacking changes until they've eyes on it.
2. **Fix the projects-section background lerp** (known issue #1 in `docs/known-issues.md`). Recommended approach: pre-brighten the target hexes in `src/scroll/transitions/aboutToProjects.ts` and `projectsToContact.ts` empirically until they survive ACES tone mapping. ~5 min.
3. **Investigate the avatar pose at scroll 0** — confirm the idle stretch isn't firing during initial mount. Check `src/three/easter-eggs/idleStretch.ts`.
4. **Investigate the live monitor screen** — the `DeskMonitor.ts` CanvasTexture may not be visible because of UV/face-winding. Check `src/three/room/Room.ts`'s laptop builder.
5. **When the user provides** Avaturn `character.glb` → wire it in by changing one line in `Avatar.ts` (the `// TODO(phase3-glb)` comment marks the spot). The contract is already shaped for it.
6. **When the user provides jazz tracks** → drop them in `public/audio/`, no code changes needed; Howler will start serving them on next dev server reload.

---

## 13. Quick reference

### Theme colours (from `src/styles/global.css`)
```css
--color-cream: #fff5e9        /* Hero / projects / footer light bg */
--color-cream-2: #ffe8cc      /* Contact bg */
--color-ink: #14110f          /* Main text colour */
--color-grape: #6b2bd9        /* Accent purple */
--color-magenta: #ff2e93      /* Accent pink */
--color-tangerine: #ff7a1a    /* CTA orange */
--color-lemon: #ffd23f        /* Accent yellow */
--color-mint: #2bd9a3         /* "Available" pulse dot */
--color-deep: #060a26         /* About/hologram dark bg */
--color-deep-2: #0d1240       /* DeskMonitor canvas texture bg */
--color-cyan: #4ad8ff         /* Hologram + about accents */
--color-arg-blue: #75aadb     /* Argentina jersey blue */
--color-arg-white: #ffffff
```

### Camera stops (from `src/scroll/timeline.ts`)
```ts
HERO_STOP     pos (1.5, 1.6, 3.2)   look (0.5, 1.1, 0)
ABOUT_STOP    pos (0,   1.6, 3.5)   look (0,   1.4, 8)    // looks at parked hologram
PROJECTS_STOP pos (0,   1.6, 3.5)   look (0,   1.2, 0)
CONTACT_STOP  pos (0,   1.6, 19.5)  look (0,   1.2, 16)   // flies to parked mailroom
```

### Section anchors
- `#top` — outer Hero section element (back-to-top destination)
- `#hero` — inner hero content
- `#about` — about section
- `#projects` — projects section
- `#contact` — contact section

### Avatar poses (`src/three/characters/Avatar.ts` `POSES` table)
- `'sitting'` — hero default, leaned forward at the desk
- `'standing'` — projects/contact default, arms slightly crossed
- `'celebration'` — konami code response
- `'stretch'` — 30s idle response

### Easter egg props (clickable via raycaster)
- `room.props.strawHat` — hat lifts to avatar's head
- `room.props.football` — cannon-es physics kick
- `room.props.headphones` — onto avatar's head + audio muffle
- `room.props.mangaStack` — top book opens flat
- `room.props.lamp` — toggles on/off
- `room.props.mug` — extra steam puff
- Konami code — keyboard sequence triggers celebration pose

### When you're confused, read in this order:
1. `docs/CONTEXT.md` (this file)
2. `src/three/contracts.d.ts` (the interfaces)
3. `src/components/ThreeCanvas.vue` (the orchestration root — see how everything is wired)
4. `src/scroll/timeline.ts` (the master timeline + state machine)
5. `src/three/room/Room.ts` (every prop is a labelled function)
6. `docs/known-issues.md` (what's broken, what's a wontfix)
7. `/Users/omen/.claude/plans/noble-painting-coral.md` (the original plan, useful for the creative concept)

### When you make a change:
1. Run `npm run build` first to confirm baseline is green
2. Make the change
3. Run `npm run build` again to confirm it didn't break anything
4. If it touched the canvas, start `npm run dev`, navigate via Playwright, screenshot
5. Commit with a descriptive message
6. **Don't push** — git identity is unsettled
