/**
 * Animated browser tab — favicon + title.
 *
 * Combines:
 *  1. Canvas-drawn animated emoji favicon (sway / rotate / bounce)
 *  2. Section-reactive emoji & title
 *  3. Typing effect on section change
 *  4. Emoji ticker sliding across the title
 *  5. Late-night flavour text
 */

interface SectionMeta {
  emoji: string
  label: string
  flavour: string
}

const sections: Record<string, SectionMeta> = {
  hero:     { emoji: '☕', label: 'Home',    flavour: 'awake at 2 am' },
  about:    { emoji: '👤', label: 'About',   flavour: 'the backstory' },
  projects: { emoji: '💼', label: 'Work',    flavour: 'shipping code' },
  contact:  { emoji: '✉️', label: 'Contact', flavour: 'say hello' },
}

const TITLE_BASE = 'Chirag'
const TYPING_SPEED = 80           // ms per character

let activeSection = 'hero'
let animFrame = 0
let titleInterval: ReturnType<typeof setInterval> | null = null
let faviconRaf: number | null = null
let typingTimeout: ReturnType<typeof setTimeout> | null = null

// ── Favicon canvas ────────────────────────────────────────────────
const canvas = document.createElement('canvas')
canvas.width = 64
canvas.height = 64
const ctx = canvas.getContext('2d')!

let linkEl: HTMLLinkElement | null = null

function getFaviconLink(): HTMLLinkElement {
  if (linkEl) return linkEl
  linkEl = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!linkEl) {
    linkEl = document.createElement('link')
    linkEl.rel = 'icon'
    document.head.appendChild(linkEl)
  }
  return linkEl
}

function drawFavicon(emoji: string, frame: number) {
  ctx.clearRect(0, 0, 64, 64)

  // Spin in place like a clock hand
  const angle = frame * 0.04

  ctx.save()
  ctx.translate(32, 32)
  ctx.rotate(angle)
  ctx.font = '46px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(emoji, 0, 0)
  ctx.restore()

  getFaviconLink().href = canvas.toDataURL('image/png')
}

// ── Title animation ───────────────────────────────────────────────
let typingIndex = 0
let cursorVisible = true
let cursorInterval: ReturnType<typeof setInterval> | null = null

function buildTargetTitle(section: SectionMeta): string {
  return `${TITLE_BASE} · ${section.label}`
}

function typeTitle(target: string) {
  typingIndex = 0
  if (typingTimeout) clearTimeout(typingTimeout)
  if (cursorInterval) clearInterval(cursorInterval)

  function typeNext() {
    if (typingIndex <= target.length) {
      document.title = target.slice(0, typingIndex) + '▌'
      typingIndex++
      typingTimeout = setTimeout(typeNext, TYPING_SPEED)
    } else {
      // Typing done — start blinking cursor
      startCursorBlink(target)
    }
  }
  typeNext()
}

function startCursorBlink(title: string) {
  cursorVisible = true
  cursorInterval = setInterval(() => {
    cursorVisible = !cursorVisible
    document.title = title + (cursorVisible ? '▌' : '')
  }, 500)
}

// ── Section detection via IntersectionObserver ────────────────────
let observer: IntersectionObserver | null = null

function onSectionChange(id: string) {
  if (id === activeSection) return
  activeSection = id
  const meta = sections[id] || sections.hero

  typeTitle(buildTargetTitle(meta))
}

function setupObserver() {
  observer = new IntersectionObserver(
    (entries) => {
      // Pick the most visible section
      let best: IntersectionObserverEntry | null = null
      for (const entry of entries) {
        if (entry.isIntersecting) {
          if (!best || entry.intersectionRatio > best.intersectionRatio) {
            best = entry
          }
        }
      }
      if (best) {
        const id = best.target.id || 'hero'
        onSectionChange(id)
      }
    },
    { threshold: [0.2, 0.5, 0.8] },
  )

  // Observe known sections — retry briefly in case DOM isn't ready
  const sectionIds = ['hero', 'about', 'projects', 'contact']
  for (const id of sectionIds) {
    const el = document.getElementById(id)
    if (el) observer.observe(el)
  }

  // Also observe by tag as fallback (HeroSection might not have id="hero")
  const allSections = document.querySelectorAll('section[id]')
  allSections.forEach((el) => observer!.observe(el))
}

// ── Lifecycle ─────────────────────────────────────────────────────

export function startTabAnimation() {
  // Favicon loop — requestAnimationFrame for max smoothness
  function faviconLoop() {
    animFrame++
    const meta = sections[activeSection] || sections.hero
    drawFavicon(meta.emoji, animFrame)
    faviconRaf = requestAnimationFrame(faviconLoop)
  }
  faviconRaf = requestAnimationFrame(faviconLoop)

  // Initial title
  const meta = sections.hero
  typeTitle(buildTargetTitle(meta))

  // Observe sections after a tick (DOM needs to be rendered)
  requestAnimationFrame(() => {
    setupObserver()
  })
}

export function stopTabAnimation() {
  if (faviconRaf) cancelAnimationFrame(faviconRaf)
  if (titleInterval) clearInterval(titleInterval)
  if (typingTimeout) clearTimeout(typingTimeout)
  if (cursorInterval) clearInterval(cursorInterval)
  if (observer) observer.disconnect()

  // Restore static title
  document.title = 'Chirag Goel'
  const link = getFaviconLink()
  link.href = '/favicon.svg'
}
