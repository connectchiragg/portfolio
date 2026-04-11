/**
 * prefersReducedMotion.ts — Thin wrapper around the
 * `(prefers-reduced-motion: reduce)` media query.
 *
 * Used by the master timeline and easter-egg system to tame large
 * parallax / camera shakes / particle bursts for visitors who have
 * requested reduced motion at the OS level.
 *
 * Safe to call in SSR-ish contexts: if `window` or `matchMedia` is
 * missing, both functions no-op gracefully.
 */

const QUERY = '(prefers-reduced-motion: reduce)'

/** Returns `true` if the user has requested reduced motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(QUERY).matches
}

/**
 * Subscribes to changes in the reduced-motion preference.
 * Returns an unsubscribe function.
 */
export function watchReducedMotion(cb: (reduced: boolean) => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {
      // no-op unsubscribe
    }
  }

  const mql = window.matchMedia(QUERY)
  const handler = (ev: MediaQueryListEvent): void => {
    cb(ev.matches)
  }
  mql.addEventListener('change', handler)

  return () => {
    mql.removeEventListener('change', handler)
  }
}
