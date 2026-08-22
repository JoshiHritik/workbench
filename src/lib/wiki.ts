export interface WikiInfo {
  title: string
  image: string | null
  extract: string | null
  url: string | null
}

export interface NearbyPlace {
  title: string
  distanceMeters: number
}

const cache = new Map<string, WikiInfo | null>()

// Real photos and descriptions for named landmarks, fetched live from Wikipedia
// (free, no API key, CORS-enabled). We never fabricate this — if Wikipedia has
// no matching page, we simply return null and the UI falls back to a generic
// category image instead of a fake claim.
export async function fetchWikiInfo(query: string): Promise<WikiInfo | null> {
  const key = query.trim().toLowerCase()
  if (cache.has(key)) return cache.get(key) ?? null
  if (!query.trim()) return null

  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        query,
      )}&srlimit=1&format=json&origin=*`,
    )
    const searchData = await searchRes.json()
    const title = searchData?.query?.search?.[0]?.title
    if (!title) {
      cache.set(key, null)
      return null
    }

    const summaryRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
    if (!summaryRes.ok) {
      cache.set(key, null)
      return null
    }
    const summary = await summaryRes.json()
    const info: WikiInfo = {
      title: summary.title ?? title,
      image: summary.thumbnail?.source ?? summary.originalimage?.source ?? null,
      extract: summary.extract ?? null,
      url: summary.content_urls?.desktop?.page ?? null,
    }
    cache.set(key, info)
    return info
  } catch {
    cache.set(key, null)
    return null
  }
}

// Real nearby landmarks near a coordinate, via Wikipedia's geosearch — this is
// how "Things to do" gets populated for literally any place on Earth, not just
// the handful of cities we've manually seeded activities for.
export async function fetchNearbyPlaces(lat: number, lon: number, limit = 10): Promise<NearbyPlace[]> {
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=10000&gslimit=${limit}&format=json&origin=*`,
    )
    const data = await res.json()
    const results = data?.query?.geosearch ?? []
    return results.map((r: { title: string; dist: number }) => ({ title: r.title, distanceMeters: r.dist }))
  } catch {
    return []
  }
}
