/**
 * customCursor.ts — DOM custom cursor for the portfolio.
 *
 * Two stacked circles (a small "dot" and a slightly larger trailing
 * "tail" with a lerp delay) follow the mouse, rendered with
 * `mix-blend-mode: difference` so the cursor reads against any
 * background. Hovering any <a> or <button> enlarges the dot to 32px.
 *
 * This is deliberately DOM-only — no Three.js involvement, no RAF jank
 * from the WebGL loop.
 */

interface CursorHandle {
  dispose: () => void
}

const DOT_SIZE = 16
const DOT_HOVER_SIZE = 32
const TAIL_SIZE = 28
const TAIL_LERP = 0.18

/**
 * Mount the custom cursor. Returns a handle whose `dispose()` removes
 * the DOM elements and detaches every listener.
 */
export function mountCustomCursor(): CursorHandle {
  const dot = document.createElement('div')
  const tail = document.createElement('div')

  const baseStyle = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'pointer-events: none',
    'z-index: 9999',
    'background: white',
    'border-radius: 50%',
    'mix-blend-mode: difference',
    'transition: width 0.18s ease, height 0.18s ease, margin 0.18s ease',
    'will-change: transform',
  ].join(';')

  dot.style.cssText = `${baseStyle}; width: ${DOT_SIZE}px; height: ${DOT_SIZE}px;`
  tail.style.cssText = `${baseStyle}; width: ${TAIL_SIZE}px; height: ${TAIL_SIZE}px; opacity: 0.35;`

  document.body.appendChild(tail)
  document.body.appendChild(dot)

  let mouseX = window.innerWidth / 2
  let mouseY = window.innerHeight / 2
  let tailX = mouseX
  let tailY = mouseY
  let hovering = false
  let rafId = 0

  const onMouseMove = (e: MouseEvent): void => {
    mouseX = e.clientX
    mouseY = e.clientY
  }

  const onOver = (e: MouseEvent): void => {
    const target = e.target as Element | null
    if (target && target.closest('a, button, [data-cursor="hover"]')) {
      hovering = true
      const size = DOT_HOVER_SIZE
      dot.style.width = `${size}px`
      dot.style.height = `${size}px`
    }
  }

  const onOut = (e: MouseEvent): void => {
    const target = e.target as Element | null
    if (target && target.closest('a, button, [data-cursor="hover"]')) {
      hovering = false
      dot.style.width = `${DOT_SIZE}px`
      dot.style.height = `${DOT_SIZE}px`
    }
  }

  const tick = (): void => {
    tailX += (mouseX - tailX) * TAIL_LERP
    tailY += (mouseY - tailY) * TAIL_LERP

    const dotSize = hovering ? DOT_HOVER_SIZE : DOT_SIZE
    dot.style.transform = `translate(${mouseX - dotSize / 2}px, ${mouseY - dotSize / 2}px)`
    tail.style.transform = `translate(${tailX - TAIL_SIZE / 2}px, ${tailY - TAIL_SIZE / 2}px)`

    rafId = window.requestAnimationFrame(tick)
  }

  window.addEventListener('mousemove', onMouseMove, { passive: true })
  document.body.addEventListener('mouseover', onOver)
  document.body.addEventListener('mouseout', onOut)
  rafId = window.requestAnimationFrame(tick)

  const dispose = (): void => {
    window.cancelAnimationFrame(rafId)
    window.removeEventListener('mousemove', onMouseMove)
    document.body.removeEventListener('mouseover', onOver)
    document.body.removeEventListener('mouseout', onOut)
    if (dot.parentNode) dot.parentNode.removeChild(dot)
    if (tail.parentNode) tail.parentNode.removeChild(tail)
  }

  return { dispose }
}
