# Asset shortlist (RC1 research)

**Status**: Reference only. Phase 3 builds the scene with Three.js primitives. Use this list later if you want to upgrade specific props from primitives to real GLBs.

**How to swap a primitive for a real GLB**:

1. Pick a slot below and choose one of the candidates
2. Download the `.glb` from the source URL
3. Place at `public/models/{slot}.glb` (e.g. `public/models/desk.glb`)
4. Run `npm run optimise:models` to compress
5. In `src/three/room/Room.ts`, find the `// PRIMITIVE: {slot}` comment and replace the primitive block with:
   ```ts
   const { scene: glb } = await loader.load('/models/desk.glb')
   desk.add(glb)
   ```

The primitives and the GLB swaps are designed to occupy the same world position/scale, so swapping is a one-line change per prop.

---

## Hard rules used by RC1

- CC0 or CC-BY only (no CC-BY-NC, no GPL, no "personal use only")
- No copyrighted character IP (no anime franchises, no comic characters)
- No brand logos (no Apple, Adidas, Nike, Coca-Cola, etc.)
- Stylised low-poly aesthetic preferred (Quaternius / Kenney / Poly Pizza)

---

## Slot 1 — Room shell (walls + floor + ceiling)

| # | Source | URL | License | Notes |
|---|--------|-----|---------|-------|
| 1 | Quaternius Ultimate House Interior | <https://quaternius.com/packs/ultimatehomeinterior.html> | CC0 | 120+ models, FBX/OBJ/Blend (needs GLB conversion) |
| 2 | Poly Pizza — Modular Floor And Wall Kit by Charlie | <https://poly.pizza/m/zQoxJANttP> | CC-BY 3.0 | Modular |

**RC1 default:** Quaternius pack — but it requires FBX→GLB conversion outside the standard pipeline.

**Phase 3 fallback (current):** primitive `BoxGeometry` walls + floor with the cream/deep palette.

---

## Slot 2 — Desk

| # | Source | URL | License |
|---|--------|-----|---------|
| 1 | Poly Pizza — Desk by Quaternius | <https://poly.pizza/m/V86Go2rlnq> | CC0 |
| 2 | Poly Pizza — Desk by Poly by Google | <https://poly.pizza/m/dptlMEX4tF_> | CC-BY 3.0 |
| 3 | Kenney Furniture Kit (bundle) | <https://poly.pizza/bundle/Furniture-Kit-NoG1sEUD1z> | CC0 |

**RC1 default:** #1 Quaternius desk (CC0).

---

## Slot 3 — Laptop

| # | Source | URL | License |
|---|--------|-----|---------|
| 1 | Poly Pizza — Kenney laptop | <https://poly.pizza/search/laptop%20computer> | CC0 |
| 2 | Poly Pizza — Poly by Google laptop | <https://poly.pizza/search/laptop%20computer> | CC-BY 3.0 |

**RC1 default:** #1 Kenney laptop (CC0). Re-colour to space-black in code.

---

## Slot 4 — Monitor (secondary screen)

| # | Source | URL | License | Notes |
|---|--------|-----|---------|-------|
| 1 | Poly Pizza — Simple Computer Monitor by Thomas DR | <https://poly.pizza/m/b03hFZNSltH> | CC-BY 3.0 | ~896 tris |
| 2 | Poly Pizza — CRT Monitor by Jarlan Perez | <https://poly.pizza/m/8jVB0zIXKCv> | CC-BY 3.0 | retro vibe |
| 3 | Poly Pizza — Gaming Computer by Alex Safayan | <https://poly.pizza/m/5cN7W4ufoII> | CC-BY 3.0 | |

**RC1 default:** #2 CRT Monitor — fits the late-night vibe.

---

## Slot 5 — Chair

| # | Source | URL | License |
|---|--------|-----|---------|
| 1 | Poly Pizza — Chair by Quaternius | <https://poly.pizza/search/chair> | CC0 |
| 2 | Kenney Furniture Kit (Desk Chair) | <https://poly.pizza/bundle/Furniture-Kit-NoG1sEUD1z> | CC0 |

**RC1 default:** #2 Kenney desk chair (CC0).

---

## Slot 6 — Mug

| # | Source | URL | License |
|---|--------|-----|---------|
| 1 | Poly Pizza — Mug by Kenney | <https://poly.pizza/m/fis2ugeLbn> | CC0 |
| 2 | Poly Pizza — Mug by Poly by Google | <https://poly.pizza/m/2jVUdnj4mVP> | CC-BY 3.0 |
| 3 | Poly Pizza — Coffee Mug by Michael Fuchs | <https://poly.pizza/m/eYH-QqBybgU> | CC-BY 3.0 |

**RC1 default:** #1 Kenney mug (CC0). Re-colour to green in code.

---

## Slot 7 — Headphones

| # | Source | URL | License |
|---|--------|-----|---------|
| 1 | Poly Pizza — Headphones by CreativeTrio | <https://poly.pizza/search/headphones> | CC0 |
| 2 | Various Kenney over-ear | <https://poly.pizza/search/headphones> | CC0 |

**RC1 default:** #1 CreativeTrio headphones. Re-colour to black in code.

---

## Slot 8 — Lamp (desk lamp)

| # | Source | URL | License |
|---|--------|-----|---------|
| 1 | Poly Pizza — Light Desk by Quaternius | <https://poly.pizza/search/lamp> | CC0 |
| 2 | Poly Pizza — Lamp Round Table by Kenney | <https://poly.pizza/search/lamp> | CC0 |

**RC1 default:** #1 Quaternius lamp (CC0).

---

## Slot 9 — Football

| # | Source | URL | License |
|---|--------|-----|---------|
| 1 | Poly Pizza — Football by Zsky | <https://poly.pizza/m/tDblqBpmOZ> | CC-BY 3.0 |
| 2 | Poly Pizza — Soccer ball by jeremy | <https://poly.pizza/m/9z5905buuy3> | CC-BY 3.0 |
| 3 | Poly Pizza — Simple soccer football by Smirnoff Alexander | <https://poly.pizza/m/57u6P7Sr7K0> | CC-BY 3.0 |

**RC1 default:** #1 Zsky football. Phase 3 primitive: white sphere with black pentagon material.

---

## Slot 10 — Straw hat

| # | Source | URL | License |
|---|--------|-----|---------|
| 1 | Poly Pizza — Hat Stylised by hat_my_guy | <https://poly.pizza/m/lNN3PlrjSa> | CC0 |

**RC1 default:** #1 generic stylised hat (CC0). Add red ribbon as a torus material in code.

---

## Slot 11 — Manga / book stack

| # | Source | URL | License |
|---|--------|-----|---------|
| 1 | Poly Pizza — Open Book by Quaternius | <https://poly.pizza/m/FsCIGEfTEs> | CC0 |
| 2 | Kenney Furniture Kit (books) | <https://poly.pizza/bundle/Furniture-Kit-NoG1sEUD1z> | CC0 |

**RC1 default:** #1 Quaternius open book (CC0). Duplicate + offset to make a stack.

---

## Slot 12 — CRT TV (retro)

| # | Source | URL | License |
|---|--------|-----|---------|
| 1 | Poly Pizza — CRT Monitor by Jarlan Perez | <https://poly.pizza/m/8jVB0zIXKCv> | CC-BY 3.0 |
| 2 | Sketchfab — Low Poly CRT TV by MrEliptik | <https://sketchfab.com/3d-models/low-poly-crt-tv-e493838af1d64800bc2008c231925f11> | check |

**RC1 default:** #1 Jarlan Perez CRT (same as monitor — repurpose).

---

## Slot 13 — Succulent / potted plant

| # | Source | URL | License |
|---|--------|-----|---------|
| 1 | Poly Pizza — Potted Plant by scaranto | <https://poly.pizza/m/auhzQHajHd> | CC0 |
| 2 | Poly Pizza — Potted Plant by Kenney | <https://poly.pizza/m/23Dx9CC95C> | CC0 |
| 3 | Poly Pizza — Flowers by Quaternius | <https://poly.pizza/m/NBUxHir6FJ> | CC0 |

**RC1 default:** #1 scaranto potted plant (CC0).

---

## Slot 14 — Corkboard

**RC1 default:** NONE — fallback to programmatic primitive (textured plane). Already the Phase 3 implementation.

---

## Slot 15 — Cardboard packages / boxes

| # | Source | URL | License | Notes |
|---|--------|-----|---------|-------|
| 1 | Sketchfab — CC0 Cardboard Box Closed by plaggy | <https://sketchfab.com/3d-models/cc0-cardboard-box-closed-76c43725661d4e609e47a4dec95b72cf> | CC0 | ~180 tris, PBR textures |
| 2 | Sketchfab — Cardboard Boxes by Shitanaga | <https://sketchfab.com/3d-models/cardboard-boxes-1c55b57482d7401481ff516af6503d05> | CC-BY 3.0 | stacked |

**RC1 default:** #1 plaggy CC0 box. Phase 3 primitive: instanced BoxGeometry with cardboard-brown material.

---

## Slot 16 — Envelopes

| # | Source | URL | License | Notes |
|---|--------|-----|---------|-------|
| 1 | Sketchfab — Envelope Low Poly by Artbrakadabra | <https://sketchfab.com/3d-models/envelope-low-poly-5eba154c3ac74f29bef19882d64f41c7> | CC-BY | ~4.8k tris |
| 2 | Sketchfab — Envelope by SixGames | <https://sketchfab.com/3d-models/envelope-3d-model-free-2e720561fd3745549fe6b3143d1f8b48> | CC0 | 32 tris |

**RC1 default:** #2 SixGames CC0 envelope. Phase 3 primitive: thin BoxGeometry with off-white material.

---

## Attribution (if you swap in CC-BY assets)

If any of the CC-BY picks above end up in `public/models/`, add a `Credits` line to the footer or a small `/credits` page mentioning the artist + license. CC0 picks need no attribution.

The Phase 3 primitive implementation needs **zero** attribution because it generates everything from scratch.
