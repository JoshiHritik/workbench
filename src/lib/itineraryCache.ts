export interface ItineraryActivity {
  time: string
  name: string
  category: string
  estimated_cost: number
  tip?: string
  best_time?: string
}

export interface ItineraryDay {
  day: number
  date: string
  city: string
  theme?: string
  activities: ItineraryActivity[]
}

export interface ItineraryResult {
  days: ItineraryDay[]
}

function itineraryCacheKey(tripId: string) {
  return `globetrotter_itinerary_${tripId}`
}

export function loadCachedItinerary(tripId: string): ItineraryResult | null {
  try {
    const raw = localStorage.getItem(itineraryCacheKey(tripId))
    return raw ? (JSON.parse(raw) as ItineraryResult) : null
  } catch {
    return null
  }
}

export function saveCachedItinerary(tripId: string, result: ItineraryResult) {
  try {
    localStorage.setItem(itineraryCacheKey(tripId), JSON.stringify(result))
  } catch {
    // Not worth failing over — worst case it just regenerates next time.
  }
}

export function clearCachedItinerary(tripId: string) {
  localStorage.removeItem(itineraryCacheKey(tripId))
}
