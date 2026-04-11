/**
 * gpu.ts — Simplified GPU-tier detection for adaptive quality.
 *
 * Wraps `detect-gpu`'s `getGPUTier()` and normalises its result to a
 * flat `{ tier, isMobile, gpu }` shape the rest of the app can switch
 * on. The first call does the real async detection; subsequent calls
 * resolve synchronously from a module-scoped cache so it is safe to
 * sprinkle across boot code.
 */

import { getGPUTier } from 'detect-gpu'

export interface GpuInfo {
  /** 0 (unsupported / blocklisted) .. 3 (high-end) */
  tier: number
  isMobile: boolean
  gpu: string | null
}

let cached: GpuInfo | null = null
let pending: Promise<GpuInfo> | null = null

/**
 * Detects GPU tier. Result is cached in module scope after the first
 * call so repeated invocations are effectively synchronous.
 */
export async function detectGpuTier(): Promise<GpuInfo> {
  if (cached) return cached
  if (pending) return pending

  pending = (async () => {
    try {
      const result = await getGPUTier()
      cached = {
        tier: typeof result.tier === 'number' ? result.tier : 0,
        isMobile: Boolean(result.isMobile),
        gpu: result.gpu ?? null,
      }
    } catch {
      cached = { tier: 0, isMobile: false, gpu: null }
    }
    return cached
  })()

  return pending
}
