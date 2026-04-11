/**
 * geoip.ts — Visitor city lookup for the "Late Night, Bengaluru" portfolio.
 *
 * Calls a free public IP → city service (ipapi.co) to personalise the
 * greeting copy (e.g. "Good evening, London"). The result is cached in
 * localStorage for 24 hours so we don't hammer the rate-limited free tier.
 *
 * All failure modes (network, CORS, rate-limit, parse errors, missing
 * localStorage) resolve to `null` silently — the consumer is expected to
 * fall back to a generic greeting.
 */

const CACHE_KEY_CITY = 'visitor-city'
const CACHE_KEY_FETCHED_AT = 'visitor-city-fetched-at'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const ENDPOINT = 'https://ipapi.co/json/'

interface IpApiResponse {
  city?: string
  country_name?: string
  error?: boolean
  reason?: string
}

/**
 * Returns the visitor's current city (e.g. "London") or `null` on any
 * failure. Result is cached in `localStorage` for 24 hours.
 */
export async function fetchVisitorCity(): Promise<string | null> {
  // Try cache first
  try {
    if (typeof localStorage !== 'undefined') {
      const cachedCity = localStorage.getItem(CACHE_KEY_CITY)
      const cachedAt = localStorage.getItem(CACHE_KEY_FETCHED_AT)
      if (cachedCity && cachedAt) {
        const age = Date.now() - Number(cachedAt)
        if (Number.isFinite(age) && age >= 0 && age < CACHE_TTL_MS) {
          return cachedCity
        }
      }
    }
  } catch {
    // localStorage unavailable (private mode, quota, etc.) — ignore.
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) {
      console.warn(`[geoip] ipapi.co responded with ${res.status}`)
      return null
    }
    const data = (await res.json()) as IpApiResponse
    if (data.error || !data.city) {
      console.warn('[geoip] ipapi.co returned no city', data.reason ?? '')
      return null
    }

    const city = data.city
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(CACHE_KEY_CITY, city)
        localStorage.setItem(CACHE_KEY_FETCHED_AT, String(Date.now()))
      }
    } catch {
      // Ignore write failures.
    }

    return city
  } catch (err) {
    console.warn('[geoip] failed to fetch visitor city', err)
    return null
  }
}
