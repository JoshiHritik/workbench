import { supabase } from './supabaseClient'
import type { City } from './types'

interface NominatimAddress {
  city?: string
  town?: string
  village?: string
  hamlet?: string
  state?: string
  country?: string
}

interface NominatimResult {
  place_id: number
  display_name: string
  address?: NominatimAddress
}

// Our curated `cities` table has ~90k entries but real gaps exist (e.g. it is
// missing Hyderabad entirely, even though it has India's other major cities) —
// the source dataset just doesn't cover every place. When the local table comes
// up short, fall back to OpenStreetMap's free Nominatim search so the user can
// still find (and pick) anywhere in the world, town or village included.
async function searchNominatim(query: string): Promise<City[]> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&featuretype=settlement&q=${encodeURIComponent(
        query,
      )}`,
    )
    if (!res.ok) return []
    const data: NominatimResult[] = await res.json()
    return data.map((row) => {
      const address = row.address ?? {}
      const name = address.city || address.town || address.village || address.hamlet || row.display_name.split(',')[0]
      return {
        id: `osm-${row.place_id}`,
        name,
        state: address.state ?? null,
        country: address.country ?? '',
        cost_index: null,
        popularity: 0,
        image_url: null,
      }
    })
  } catch {
    return []
  }
}

// A raw "count of local matches" check isn't a good enough signal to decide
// whether to bother with the live fallback: searching "Agra" against our 90k
// rows matches 50+ unrelated names that merely *contain* "agra" (Sagrada
// Familia, Wagrain, Bagratashen...) padding the count well past any threshold,
// even though none of them is the city the user is actually looking for and
// Agra itself isn't in the table at all. So: always run both, and rank by
// whether the name actually starts with what was typed.
export async function searchCities(query: string): Promise<City[]> {
  const [localResults, remote] = await Promise.all([
    supabase.from('cities').select('*').ilike('name', `%${query}%`).order('popularity', { ascending: false }).limit(10),
    searchNominatim(query),
  ])

  const local = localResults.data ?? []
  const seen = new Set<string>()
  const merged: City[] = []
  for (const city of [...local, ...remote]) {
    const key = city.name.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(city)
    }
  }

  const q = query.trim().toLowerCase()
  merged.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q)
    const bStarts = b.name.toLowerCase().startsWith(q)
    if (aStarts !== bStarts) return aStarts ? -1 : 1
    return b.popularity - a.popularity
  })

  return merged.slice(0, 6)
}
