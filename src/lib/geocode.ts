export interface GeocodeResult {
  lat: number
  lon: number
  displayName: string
}

const cache = new Map<string, GeocodeResult | null>()

// Real-world coordinates via OpenStreetMap's free Nominatim geocoder — no API
// key required. Used only to place a real pin on the map for a specific place;
// never used to invent a location we can't actually resolve.
export async function geocode(query: string): Promise<GeocodeResult | null> {
  const key = query.trim().toLowerCase()
  if (cache.has(key)) return cache.get(key) ?? null
  if (!query.trim()) return null

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`,
    )
    const data = await res.json()
    const first = data?.[0]
    if (!first) {
      cache.set(key, null)
      return null
    }
    const result: GeocodeResult = {
      lat: parseFloat(first.lat),
      lon: parseFloat(first.lon),
      displayName: first.display_name,
    }
    cache.set(key, result)
    return result
  } catch {
    cache.set(key, null)
    return null
  }
}
