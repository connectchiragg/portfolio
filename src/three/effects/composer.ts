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

  // 2. Bloom — pops lamp / hologram / emissive screens.
  const bloomEffect = new BloomEffect({
    intensity: 1.2,
    luminanceThreshold: 0.7,
    luminanceSmoothing: 0.4,
    mipmapBlur: true,
  })
  const bloomPass = new EffectPass(ctx.camera, bloomEffect)
  composer.addPass(bloomPass)

  // 3. Vignette — subtle edge darkening.
  const vignetteEffect = new VignetteEffect({
    darkness: 0.5,
    offset: 0.3,
  })
  const vignettePass = new EffectPass(ctx.camera, vignetteEffect)
  composer.addPass(vignettePass)

  // 4. Film grain via NoiseEffect, blended OVERLAY at ~0.15.
  const noiseEffect = new NoiseEffect({
    blendFunction: BlendFunction.OVERLAY,
    premultiply: true,
  })
  noiseEffect.blendMode.opacity.value = 0.15
  const noisePass = new EffectPass(ctx.camera, noiseEffect)
  composer.addPass(noisePass)

  // 5. Chromatic aberration — intensity controlled via offset magnitude.
  const baseCAOffset = new Vector2(0.0005, 0.0005)
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
