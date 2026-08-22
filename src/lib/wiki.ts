export interface WikiInfo {
  title: string
  image: string | null
  extract: string | null
  description: string | null
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
      description: summary.description ?? null,
      url: summary.content_urls?.desktop?.page ?? null,
    }
    cache.set(key, info)
    return info
  } catch {
    cache.set(key, null)
    return null
  }
}

// Fetches a Wikipedia summary directly by exact page title (skips the search
// step) — used for geosearch results, which already give us exact titles.
export async function fetchWikiSummaryByTitle(title: string): Promise<WikiInfo | null> {
  const key = title.trim().toLowerCase()
  if (cache.has(key)) return cache.get(key) ?? null

  try {
    const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
    if (!res.ok) {
      cache.set(key, null)
      return null
    }
    const summary = await res.json()
    const info: WikiInfo = {
      title: summary.title ?? title,
      image: summary.thumbnail?.source ?? summary.originalimage?.source ?? null,
      extract: summary.extract ?? null,
      description: summary.description ?? null,
      url: summary.content_urls?.desktop?.page ?? null,
    }
    cache.set(key, info)
    return info
  } catch {
    cache.set(key, null)
    return null
  }
}

// Wikipedia's search and geosearch will match literally anything — office
// buildings, colleges, hospitals, biographies of notable people, even news
// articles about violent events, if the words happen to overlap with an
// activity name or a coordinate happens to be nearby. The short `description`
// field Wikipedia attaches to each page is a reliable enough signal to filter
// most of that out without needing a paid places API. Two categories matter
// most: things that plainly aren't a place a traveler would visit (companies,
// institutions, biographies), and — importantly — anything describing a
// violent or tragic event, which must never surface as "here's a thing to do".
const NOT_A_PLACE_TO_VISIT = [
  'company',
  'commercial',
  'corporation',
  'developer',
  'college',
  'university',
  'school',
  'hospital',
  'medical',
  'bank',
  'embassy',
  'consulate',
  'political party',
  'politician',
  'member of parliament',
  'member of the legislative',
  'chief minister',
  'prime minister',
  'president',
  'minister',
  'governor',
  'viceroy',
  'monarch',
  'king of',
  'queen of',
  'emperor',
  'diplomat',
  'businessman',
  'businesswoman',
  'businessperson',
  'entrepreneur',
  'philanthropist',
  'activist',
  'freedom fighter',
  'revolutionary',
  'author',
  'writer',
  'poet',
  'singer',
  'musician',
  'artist',
  'film director',
  'cricketer',
  'footballer',
  'actor',
  'actress',
  'film',
  'journalist',
  'scientist',
  'economist',
  'historian',
  'philosopher',
  'constituency',
  'currency',
  'banknote',
  'courthouse',
  'police station',
  'government office',
  'housing',
  'residential',
  'apartment',
  'law firm',
  'newspaper',
  'television channel',
  'stock exchange',
  'financial institution',
  'financial services',
  'regulatory body',
  'regulatory authority',
  'development bank',
  'metro station',
  'railway station',
  'institute',
  'business school',
  'gem and jewel',
]

// Never show these as a "thing to do" or an activity photo, full stop —
// checked separately from the above so it's easy to see this list exists
// specifically to keep violent/tragic news events out of trip-planning UI.
const UNSAFE_TOPICS = [
  'attack',
  'bombing',
  'explosion',
  'blast',
  'terroris',
  'shooting',
  'gunman',
  'massacre',
  'riot',
  'unrest',
  'uprising',
  'coup',
  'genocide',
  'siege',
  'hostage',
  'assassinat',
  'killed',
  'death toll',
  'casualties',
  'disaster',
  'earthquake',
  'flood',
  'crash',
  'war',
  'conflict',
  'insurgency',
  'protest',
]

function matchesAny(desc: string, words: string[]): boolean {
  return words.some((word) => desc.includes(word))
}

export function looksLikeAttraction(info: WikiInfo): boolean {
  if (!info.image) return false
  const desc = (info.description ?? '').toLowerCase()
  if (matchesAny(desc, UNSAFE_TOPICS)) return false
  if (!desc) return true
  return !matchesAny(desc, NOT_A_PLACE_TO_VISIT)
}

// Looser check used when we already have a fallback image ready (activity
// category photos) and just need to know whether a Wikipedia match is safe
// and on-topic enough to trust for the description text — a photo isn't
// required here the way it is for looksLikeAttraction.
export function isSafeMatch(info: WikiInfo): boolean {
  const desc = (info.description ?? '').toLowerCase()
  if (matchesAny(desc, UNSAFE_TOPICS)) return false
  if (!desc) return true
  return !matchesAny(desc, NOT_A_PLACE_TO_VISIT)
}

// The AI writes activity names as instructions ("Visit Red Fort", "Lunch at
// a local eatery"), not search queries. Searching Wikipedia for the raw
// phrase is how "Visit Red Fort" ends up matching a news article about an
// explosion near the Red Fort, and "Lunch at a local eatery" — which isn't a
// specific place at all — ends up matching something arbitrary. This strips
// the instruction verb, and returns null for anything that still doesn't
// look like a specific named place, so callers know to skip the lookup
// entirely rather than trust a guess.
const LEADING_VERB =
  /^(visit|explore|discover|see|check out|experience|walking tour of|walking through|guided tour of|tour of|stroll through|stroll around|shopping (?:at|in)|sightseeing (?:at|in))\s+/i
const GENERIC_MEAL = /^(breakfast|lunch|dinner|brunch|snack)s?\s+(at|in)\s+/i
const GENERIC_PLACEHOLDER = /^(a|an|the)\s+(local|nearby|traditional|popular|well-known|famous)\b/i

export function extractPlaceQuery(activityName: string): string | null {
  let cleaned = activityName.trim()
  const wasMeal = GENERIC_MEAL.test(cleaned)
  cleaned = cleaned.replace(GENERIC_MEAL, '').replace(LEADING_VERB, '').trim()

  if (!cleaned) return null
  if (GENERIC_PLACEHOLDER.test(cleaned)) return null
  // A meal activity that, after stripping "Lunch at", isn't a specific named
  // venue (no capital letters anywhere) isn't worth searching for.
  if (wasMeal && !/[A-Z]/.test(cleaned)) return null

  return cleaned
}

// Real nearby landmarks near a coordinate, via Wikipedia's geosearch — this is
// how "Things to do" gets populated for literally any place on Earth, not just
// the handful of cities we've manually seeded activities for.
export async function fetchNearbyPlaces(lat: number, lon: number, limit = 25): Promise<NearbyPlace[]> {
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
