/**
 * composer.ts — Postprocessing stack for the "Late Night, Bengaluru"
 * portfolio. Wraps the `postprocessing` library's EffectComposer with a
 * contract-friendly interface so the orchestrator can render via
 * `composer.render(dt)` in place of `renderer.render(scene, camera)`.
 *
 * Passes (in order):
 *   1. RenderPass   — renders scene + camera into the composer buffer
 *   2. BloomEffect  — pops the lamp, hologram and emissive screens
 *   3. VignetteEffect
 *   4. NoiseEffect  — subtle film grain (OVERLAY, opacity 0.15)
 *   5. ChromaticAberrationEffect — tiny RGB split
 *
 * Bloom / grain / vignette / chromatic aberration each live in their own
 * EffectPass so `setPasses(...)` can toggle them independently for the
 * low-GPU fallback path.
 */

import { Vector2 } from 'three'
import {
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  VignetteEffect,
  BlendFunction,
} from 'postprocessing'
import type { Composer, SceneContext } from '../contracts'

/**
 * Build the full postprocessing composer for a given SceneContext.
 */
export function createComposer(ctx: SceneContext): Composer {
  const composer = new EffectComposer(ctx.renderer)

  // 1. Render pass — always enabled.
  const renderPass = new RenderPass(ctx.scene, ctx.camera)
  composer.addPass(renderPass)

  // 2. Bloom — pops lamp / hologram / emissive screens. Threshold raised
  // so the desk surface and walls don't pick up a hazy glow.
  const bloomEffect = new BloomEffect({
    intensity: 1.55,
    luminanceThreshold: 0.62,
    luminanceSmoothing: 0.32,
    mipmapBlur: true,
    radius: 0.85,
  })
  const bloomPass = new EffectPass(ctx.camera, bloomEffect)
  composer.addPass(bloomPass)

  // 3. Vignette — subtle edge darkening, deep enough to read as anamorphic.
  const vignetteEffect = new VignetteEffect({
    darkness: 0.42,
    offset: 0.42,
  })
  const vignettePass = new EffectPass(ctx.camera, vignetteEffect)
  composer.addPass(vignettePass)

  // 4. Film grain. ADD blend with low opacity reads more like film than
  // OVERLAY, which can clip into solid regions. Density tuned subtle.
  const noiseEffect = new NoiseEffect({
    blendFunction: BlendFunction.ADD,
    premultiply: true,
  })
  noiseEffect.blendMode.opacity.value = 0.035
  const noisePass = new EffectPass(ctx.camera, noiseEffect)
  composer.addPass(noisePass)

  // 5. Chromatic aberration — barely perceptible RGB split, mostly used
  // for the fast-scroll boost via setPasses().
  const baseCAOffset = new Vector2(0.0006, 0.001)
  const chromaticEffect = new ChromaticAberrationEffect({
    offset: baseCAOffset.clone(),
    radialModulation: false,
    modulationOffset: 0,
  })
  const chromaticPass = new EffectPass(ctx.camera, chromaticEffect)
  composer.addPass(chromaticPass)

  const render = (dt: number): void => {
    composer.render(dt)
  }

  const setSize = (w: number, h: number): void => {
    composer.setSize(w, h)
  }

  const setPasses: Composer['setPasses'] = (opts) => {
    if (opts.bloom !== undefined) {
      bloomPass.enabled = opts.bloom
    }
    if (opts.vignette !== undefined) {
      vignettePass.enabled = opts.vignette
    }
    if (opts.grain !== undefined) {
      noisePass.enabled = opts.grain
    }
    if (opts.chromaticAberration !== undefined) {
      const intensity = Math.max(0, Math.min(1, opts.chromaticAberration))
      if (intensity <= 0) {
        chromaticPass.enabled = false
      } else {
        chromaticPass.enabled = true
        // Scale the offset: base offset represents intensity 1.
        chromaticEffect.offset.set(
          baseCAOffset.x * intensity,
          baseCAOffset.y * intensity,
        )
      }
    }
  }

  const dispose = (): void => {
    composer.dispose()
  }

  return {
    render,
    setSize,
    setPasses,
    dispose,
  }
}
