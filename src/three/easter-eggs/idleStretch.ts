/**
 * idleStretch.ts — Easter egg: if the mouse hasn't moved in 30s and the
 * avatar is on-screen, play the stretch pose once. Re-arms on the next
 * mouse movement. Owned by W11.
 */

import type { Avatar } from '../contracts'

export interface IdleStretchDeps {
  avatar: Avatar
}

const IDLE_MS = 30_000

/**
 * Starts an idle watcher. Returns a disposer that removes listeners and
 * cancels the rAF loop.
 */
export function setupIdleStretch(deps: IdleStretchDeps): { dispose: () => void } {
  let lastMove = performance.now()
  let fired = false
  let rafId = 0
  let timerId = 0
  let disposed = false

  const onMove = (): void => {
    lastMove = performance.now()
    fired = false
  }

  const check = (): void => {
    if (disposed) return
    const now = performance.now()
    if (!fired && now - lastMove > IDLE_MS && deps.avatar.root.visible) {
      fired = true
      deps.avatar.play('stretch')
    }
    timerId = window.setTimeout(() => {
      rafId = requestAnimationFrame(check)
    }, 1000)
  }

  window.addEventListener('mousemove', onMove)
  rafId = requestAnimationFrame(check)

  return {
    dispose: (): void => {
      disposed = true
      window.removeEventListener('mousemove', onMove)
      if (rafId) cancelAnimationFrame(rafId)
      if (timerId) window.clearTimeout(timerId)
    },
  }
}
