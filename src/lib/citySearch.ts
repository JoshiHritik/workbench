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

export async function searchCities(query: string): Promise<City[]> {
  const { data: localResults } = await supabase
    .from('cities')
    .select('*')
    .ilike('name', `%${query}%`)
    .order('popularity', { ascending: false })
    .limit(6)

  const local = localResults ?? []
  if (local.length >= 4) return local

  const remote = await searchNominatim(query)
  const seen = new Set(local.map((c) => c.name.toLowerCase()))
  const merged = [...local]
  for (const city of remote) {
    const key = city.name.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      merged.push(city)
    }
  }
  return merged.slice(0, 6)
}
