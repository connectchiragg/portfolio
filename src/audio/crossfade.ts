/**
 * crossfade — requestAnimationFrame-based linear volume tween.
 *
 * Fades `from` to 0 and `to` to `toVolume` in parallel over `durationMs`.
 * When the tween finishes, `from` is stopped (but not unloaded, so it can
 * be cross-faded back in later). Safe to call with `from = null`, in
 * which case only the `to` fade-in runs.
 *
 * Owned by W10. No gsap dependency — a few lines of math are enough.
 */

// Minimal shape of the Howler `Howl` instance we rely on here.
// The full ambient module declaration lives in `./sounds.ts`.
interface HowlLike {
  volume(v?: number): number | HowlLike
  stop(): HowlLike
  playing(): boolean
}

export function crossfade(
  from: HowlLike | null,
  to: HowlLike,
  toVolume: number,
  durationMs: number,
): void {
  const fromStartVolume =
    from != null ? (from.volume() as number) : 0
  const toStartVolume = to.volume() as number
  const start =
    typeof performance !== 'undefined' ? performance.now() : Date.now()
  const duration = Math.max(1, durationMs)

  const step = (): void => {
    const now =
      typeof performance !== 'undefined' ? performance.now() : Date.now()
    const t = Math.min(1, (now - start) / duration)

    if (from != null) {
      from.volume(fromStartVolume * (1 - t))
    }
    to.volume(toStartVolume + (toVolume - toStartVolume) * t)

    if (t < 1) {
      requestAnimationFrame(step)
    } else if (from != null) {
      from.stop()
    }
  }

  requestAnimationFrame(step)
}
