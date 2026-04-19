/**
 * Derives a poetic time-of-day label and matching sky colors from the
 * user's local clock. No permissions required — uses the browser's Date API.
 */

export interface SkyPreset {
  top: string
  mid: string
  bot: string
}

export interface TimeSlotInfo {
  label: string
  sky: SkyPreset
}

const SKY_PRESETS: Record<string, SkyPreset> = {
  'Late Night':     { top: '#0a0a1a', mid: '#101030', bot: '#1a1a3a' },
  'Night':          { top: '#0a0a1a', mid: '#101030', bot: '#1a1a3a' },
  'Early Morning':  { top: '#1a1030', mid: '#3a2050', bot: '#6a3a5a' },
  'Dawn':           { top: '#2a3060', mid: '#e08040', bot: '#ffb870' },
  'Morning':        { top: '#3a7acc', mid: '#7ab8e8', bot: '#c8e0f0' },
  'Noon':           { top: '#2060b0', mid: '#60a8e0', bot: '#a0d0f0' },
  'Afternoon':      { top: '#4080c0', mid: '#80b8e0', bot: '#d0e8f8' },
  'Evening':        { top: '#1a2040', mid: '#c06030', bot: '#ff8840' },
  'Dusk':           { top: '#101028', mid: '#3a2050', bot: '#804060' },
}

export function getTimeSlot(): TimeSlotInfo {
  const hour = new Date().getHours()
  let label: string

  if (hour >= 0 && hour < 4) label = 'Late Night'
  else if (hour >= 4 && hour < 6) label = 'Early Morning'
  else if (hour >= 6 && hour < 8) label = 'Dawn'
  else if (hour >= 8 && hour < 12) label = 'Morning'
  else if (hour >= 12 && hour < 14) label = 'Noon'
  else if (hour >= 14 && hour < 17) label = 'Afternoon'
  else if (hour >= 17 && hour < 19) label = 'Evening'
  else if (hour >= 19 && hour < 21) label = 'Dusk'
  else label = 'Night'

  return { label, sky: SKY_PRESETS[label] }
}

/** Whether this time slot should show stars in the window */
export function hasStars(label: string): boolean {
  return ['Late Night', 'Night', 'Dusk', 'Early Morning'].includes(label)
}

/**
 * Fetches the user's state/region from their IP address. No permission needed.
 * More reliable than city — ISPs often route through regional hubs but
 * the state/region is almost always correct.
 */
export async function fetchRegion(): Promise<string | null> {
  const providers = [
    async () => {
      const res = await fetch('https://ipwho.is/', { signal: AbortSignal.timeout(3000) })
      if (!res.ok) return null
      const data = await res.json()
      return data.success ? (data.region || null) : null
    },
    async () => {
      const res = await fetch('https://ipinfo.io/json', { signal: AbortSignal.timeout(3000) })
      if (!res.ok) return null
      const data = await res.json()
      return data.region || null
    },
  ]

  for (const provider of providers) {
    try {
      const region = await provider()
      if (region) return region
    } catch {
      continue
    }
  }
  return null
}
