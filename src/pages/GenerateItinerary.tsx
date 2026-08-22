import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useCurrency } from '../context/CurrencyContext'
import { fetchWikiInfo, extractPlaceQuery, isSafeMatch, type WikiInfo } from '../lib/wiki'
import { geocode, type GeocodeResult } from '../lib/geocode'
import { MiniMap } from '../components/MiniMap'
import { AppHeader } from '../components/AppHeader'
import { ActivityReviews } from '../components/ActivityReviews'
import { loadCachedItinerary, saveCachedItinerary, clearCachedItinerary } from '../lib/itineraryCache'
import type { ItineraryActivity, ItineraryDay, ItineraryResult } from '../lib/itineraryCache'
import type { Trip } from '../lib/types'

const DEFAULT_DAY_IMAGE =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=75'

// Category fallback images — used whenever we can't find a real photo of the
// specific named place on Wikipedia. Honest: represents "a food outing", not
// a claim about the exact venue.
const CATEGORY_IMAGES: Record<string, string> = {
  food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=75',
  sightseeing: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1400&q=75',
  culture: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1400&q=75',
  adventure: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1400&q=75',
  relaxation: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=75',
  beach: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1400&q=75',
  nightlife: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1400&q=75',
  shopping: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1400&q=75',
}

const LOADING_COLLAGE = [
  CATEGORY_IMAGES.sightseeing,
  CATEGORY_IMAGES.culture,
  CATEGORY_IMAGES.food,
  CATEGORY_IMAGES.adventure,
]

// The AI doesn't stick to fixed category labels — it might write "Cultural"
// instead of "Culture", or "Relaxing" instead of "Relaxation" — so match on
// a stem/alias rather than requiring an exact key, or almost everything
// silently falls through to the generic default photo.
const CATEGORY_ALIASES: Record<string, keyof typeof CATEGORY_IMAGES> = {
  cultural: 'culture',
  historic: 'culture',
  historical: 'culture',
  heritage: 'culture',
  relaxing: 'relaxation',
  relax: 'relaxation',
  wellness: 'relaxation',
  spa: 'relaxation',
  dining: 'food',
  restaurant: 'food',
  cuisine: 'food',
  sight: 'sightseeing',
  landmark: 'sightseeing',
  outdoor: 'adventure',
  outdoors: 'adventure',
  hiking: 'adventure',
  trekking: 'adventure',
  market: 'shopping',
  markets: 'shopping',
  bar: 'nightlife',
  bars: 'nightlife',
  entertainment: 'nightlife',
}

type IconName = 'calendar' | 'pin' | 'sparkles' | 'wallet' | 'clock'

function Icon({ name, className = 'h-4 w-4' }: { name: IconName; className?: string }) {
  const paths: Record<IconName, string> = {
    calendar: 'M8 2v3M16 2v3M3.5 9h17M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
    pin: 'M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
    sparkles: 'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3ZM19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z',
    wallet: 'M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z M17 12h.01 M3 9h18',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2',
  }
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  )
}

function imageForCategory(category: string) {
  const key = category.trim().toLowerCase()
  return CATEGORY_IMAGES[key] ?? CATEGORY_IMAGES[CATEGORY_ALIASES[key]] ?? DEFAULT_DAY_IMAGE
}

function destinationLabel(name: string) {
  return name.replace(/\s+trip$/i, '').trim() || name
}

// When day.theme is missing from the AI response, every day used to fall
// back to the identical "Exploring {city}" text — for a single-city trip
// that meant every single day card showed the same line. Deriving the
// fallback from that day's actual activity categories keeps it both real
// (not invented) and different day to day.
function dayFallbackTheme(day: ItineraryDay) {
  const categories = Array.from(new Set(day.activities.map((a) => a.category).filter(Boolean)))
  if (categories.length === 0) return `Day ${day.day} in ${day.city}`
  return categories.slice(0, 3).join(' & ')
}

// Only checking the day's FIRST activity for a real photo meant that if it
// happened to be a generic meal ("Breakfast at a local cafe" — no specific
// venue to look up), the whole day fell back to the same category stock
// photo, and with several days sharing that same first-activity pattern,
// every day card ended up showing the identical image. This tries a few of
// the day's activities in turn and uses the first one that resolves to a
// real photo.
function useDayImage(day: ItineraryDay) {
  const [image, setImage] = useState<string | null | undefined>(undefined)
  const candidateKey = day.activities.slice(0, 4).map((a) => a.name).join('|') + '|' + day.city

  useEffect(() => {
    let cancelled = false
    setImage(undefined)

    async function run() {
      for (const activity of day.activities.slice(0, 4)) {
        const placeQuery = extractPlaceQuery(activity.name)
        if (!placeQuery) continue
        const info = await fetchWikiInfo(`${placeQuery}, ${day.city}`)
        if (info?.image && isSafeMatch(info)) {
          if (!cancelled) setImage(info.image)
          return
        }
      }
      if (!cancelled) setImage(null)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [candidateKey])

  return image
}

// Defensive formatting — the prompt asks the model for 12-hour AM/PM time, but
// normalize here too in case it slips back to 24-hour.
function formatTime(time: string) {
  const trimmed = time.trim()
  if (/am|pm/i.test(trimmed)) return trimmed
  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return trimmed
  let hours = parseInt(match[1], 10)
  const minutes = match[2]
  const period = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours}:${minutes} ${period}`
}

// Activity names from the AI are instructions ("Visit Red Fort", "Lunch at a
// local eatery"), not search queries — searching Wikipedia for the raw
// phrase is how "Visit Red Fort" can end up matching a news article instead
// of the landmark. This cleans the name first, skips the lookup entirely for
// anything too generic to search for, and rejects any match that isn't
// actually a safe, relevant place (see isSafeMatch in lib/wiki).
function useActivityWikiInfo(activityName: string | undefined, city: string) {
  const placeQuery = activityName ? extractPlaceQuery(activityName) : null
  const [info, setInfo] = useState<WikiInfo | null | undefined>(undefined)

  useEffect(() => {
    if (!placeQuery) {
      setInfo(null)
      return
    }
    let cancelled = false
    setInfo(undefined)
    fetchWikiInfo(`${placeQuery}, ${city}`).then((res) => {
      if (cancelled) return
      setInfo(res && isSafeMatch(res) ? res : null)
    })
    return () => {
      cancelled = true
    }
  }, [placeQuery, city])

  return info
}

function useGeocode(query: string | null) {
  const [result, setResult] = useState<GeocodeResult | null | undefined>(undefined)

  useEffect(() => {
    if (!query) {
      setResult(null)
      return
    }
    let cancelled = false
    setResult(undefined)
    geocode(query).then((res) => {
      if (!cancelled) setResult(res)
    })
    return () => {
      cancelled = true
    }
  }, [query])

  return result
}

type View = { level: 'overview' } | { level: 'day'; day: number } | { level: 'activity'; day: number; activity: number }

function viewFromParams(params: URLSearchParams): View {
  const level = params.get('view')
  const day = params.get('day')
  const activity = params.get('activity')
  if (level === 'activity' && day !== null && activity !== null) {
    return { level: 'activity', day: Number(day), activity: Number(activity) }
  }
  if (level === 'day' && day !== null) {
    return { level: 'day', day: Number(day) }
  }
  return { level: 'overview' }
}

function viewToParams(view: View): Record<string, string> {
  if (view.level === 'day') return { view: 'day', day: String(view.day) }
  if (view.level === 'activity') return { view: 'activity', day: String(view.day), activity: String(view.activity) }
  return {}
}

export default function GenerateItinerary() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [phase, setPhase] = useState<'loading' | 'done' | 'error'>('loading')
  const [itinerary, setItinerary] = useState<ItineraryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [messageIndex, setMessageIndex] = useState(0)
  const [viewState, setViewState] = useState<View>(() => viewFromParams(searchParams))
  const { format: formatCurrency } = useCurrency()

  function setView(next: View) {
    setViewState(next)
    setSearchParams(viewToParams(next), { replace: false })
  }
  const view = viewState

  async function generateAndCache(tripData: Trip, tripId: string): Promise<boolean> {
    const { data, error: fnError } = await supabase.functions.invoke('generate-itinerary', {
      body: {
        destination: tripData.name,
        startDate: tripData.start_date,
        endDate: tripData.end_date,
        budget: tripData.budget,
        tripVibe: tripData.trip_vibe,
        description: tripData.description,
      },
    })

    if (fnError || data?.error) {
      setError(fnError?.message || data?.error || 'Something went wrong generating the itinerary.')
      setPhase('error')
      return false
    }

    saveCachedItinerary(tripId, data as ItineraryResult)
    setItinerary(data as ItineraryResult)
    setPhase('done')
    return true
  }

  // The itinerary is generated once by the AI and cached per trip — a page
  // refresh should show the same plan (and, via the URL params above, the
  // same day/experience) instead of silently rolling a brand new one and
  // dropping the user back at the top.
  useEffect(() => {
    if (!tripId) return
    const id = tripId
    let cancelled = false

    async function run() {
      const { data: tripData } = await supabase.from('trips').select('*').eq('id', id).single()
      if (cancelled) return
      setTrip(tripData)

      const cached = loadCachedItinerary(id)
      if (cached) {
        setItinerary(cached)
        setPhase('done')
        return
      }

      await generateAndCache(tripData, id)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [tripId])

  function handleRegenerate() {
    if (!tripId || !trip) return
    clearCachedItinerary(tripId)
    setItinerary(null)
    setPhase('loading')
    setMessageIndex(0)
    setView({ level: 'overview' })
    generateAndCache(trip, tripId)
  }

  useEffect(() => {
    if (phase !== 'loading') return
    const interval = setInterval(() => setMessageIndex((i) => Math.min(i + 1, 4)), 1600)
    return () => clearInterval(interval)
  }, [phase])

  const place = trip ? destinationLabel(trip.name) : 'your destination'
  const messages = [
    `Figuring out the best places to visit in ${place}`,
    `Matching spots to your ${trip?.trip_vibe ? trip.trip_vibe.toLowerCase() : 'trip'} style`,
    'Mapping out a day-by-day plan',
    trip?.budget ? `Keeping things within ${formatCurrency(trip.budget)}` : 'Balancing cost and experience',
    'Putting together your itinerary',
  ]

  if (phase === 'loading') {
    return (
      <div className="flex min-h-svh flex-col bg-white">
        <AppHeader />
        <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">{place}</h1>
        <p className="mt-1 text-sm text-slate-500">Building your trip…</p>

        <div className="relative mt-10 h-40 w-64 sm:h-48 sm:w-80">
          {LOADING_COLLAGE.map((src, i) => {
            const rotations = ['-rotate-6', 'rotate-3', '-rotate-2', 'rotate-6']
            const positions = [
              'left-0 top-4',
              'left-1/3 top-0',
              'left-1/4 top-1/3',
              'left-2/3 top-6',
            ]
            return (
              <img
                key={src}
                src={src}
                alt=""
                className={`absolute h-24 w-20 rounded-2xl object-cover shadow-lg ring-4 ring-white sm:h-28 sm:w-24 ${rotations[i]} ${positions[i]}`}
                style={{ zIndex: i }}
              />
            )
          })}
        </div>

        <div className="mt-10 w-full max-w-xs space-y-3 text-left">
          {messages.map((msg, i) => {
            const done = i < messageIndex
            const active = i === messageIndex
            return (
              <div key={msg} className="flex items-center gap-3">
                <span
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] ${
                    done
                      ? 'bg-emerald-500 text-white'
                      : active
                        ? 'border-2 border-slate-900 text-slate-900'
                        : 'border border-slate-200 text-transparent'
                  }`}
                >
                  {done ? '✓' : ''}
                </span>
                <span className={`text-sm ${done ? 'text-slate-400 line-through' : active ? 'text-slate-900' : 'text-slate-300'}`}>
                  {msg}
                </span>
              </div>
            )
          })}
        </div>
        </div>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex min-h-svh flex-col bg-white">
        <AppHeader />
        <div className="flex flex-1 flex-col items-center justify-center px-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
          <Link
            to={tripId ? `/trips/${tripId}` : '/dashboard'}
            className="mt-6 text-sm font-medium text-slate-900 hover:underline"
          >
            ← Back to trip
          </Link>
        </div>
      </div>
    )
  }

  if (!itinerary) return null

  const backTarget = tripId ? `/trips/${tripId}` : '/dashboard'

  return (
    <div className="min-h-svh bg-slate-50">
      <AppHeader />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Breadcrumb view={view} itinerary={itinerary} onNavigate={setView} onExit={() => navigate(backTarget)} />

        {view.level === 'overview' && (
          <OverviewView
            itinerary={itinerary}
            trip={trip}
            place={place}
            onOpenDay={(day) => setView({ level: 'day', day })}
            onRegenerate={handleRegenerate}
          />
        )}
        {view.level === 'day' && (
          <DayView
            itinerary={itinerary}
            dayIndex={view.day}
            onOpenActivity={(activity) => setView({ level: 'activity', day: view.day, activity })}
          />
        )}
        {view.level === 'activity' && (
          <ActivityView
            itinerary={itinerary}
            dayIndex={view.day}
            activityIndex={view.activity}
            onOpenActivity={(activity) => setView({ level: 'activity', day: view.day, activity })}
          />
        )}
      </div>
    </div>
  )
}

function Breadcrumb({
  view,
  itinerary,
  onNavigate,
  onExit,
}: {
  view: View
  itinerary: ItineraryResult
  onNavigate: (v: View) => void
  onExit: () => void
}) {
  const dayIndex = view.level !== 'overview' ? view.day : null
  const day = dayIndex !== null ? itinerary.days[dayIndex] : null
  const activity = view.level === 'activity' ? day?.activities[view.activity] : null

  return (
    <div className="mb-6 flex items-center gap-1.5 text-sm text-slate-500">
      <button type="button" onClick={onExit} className="hover:text-slate-900">
        ← Trip
      </button>
      <span>/</span>
      <button
        type="button"
        onClick={() => onNavigate({ level: 'overview' })}
        className={view.level === 'overview' ? 'font-medium text-slate-900' : 'hover:text-slate-900'}
      >
        Itinerary
      </button>
      {day && (
        <>
          <span>/</span>
          <button
            type="button"
            onClick={() => dayIndex !== null && onNavigate({ level: 'day', day: dayIndex })}
            className={view.level === 'day' ? 'font-medium text-slate-900' : 'hover:text-slate-900'}
          >
            Day {day.day}
          </button>
        </>
      )}
      {activity && (
        <>
          <span>/</span>
          <span className="font-medium text-slate-900">{activity.name}</span>
        </>
      )}
    </div>
  )
}

function OverviewView({
  itinerary,
  trip,
  place,
  onOpenDay,
  onRegenerate,
}: {
  itinerary: ItineraryResult
  trip: Trip | null
  place: string
  onOpenDay: (day: number) => void
  onRegenerate: () => void
}) {
  const { format: formatCurrency } = useCurrency()
  const days = itinerary.days
  const totalActivities = days.reduce((sum, d) => sum + d.activities.length, 0)
  const uniqueCities = Array.from(new Set(days.map((d) => d.city).filter(Boolean)))
  const heroWikiImage = useDayImage(days[0] ?? { day: 1, date: '', city: place, activities: [] })
  const heroImage = heroWikiImage ?? (days[0] ? imageForCategory(days[0].activities[0]?.category ?? '') : DEFAULT_DAY_IMAGE)

  const cityPins = useCityPins(uniqueCities)

  return (
    <div>
      <div className="overflow-hidden rounded-2xl">
        <div className="relative h-56 w-full sm:h-72">
          <img src={heroImage} alt={place} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-5 left-6 right-6">
            <h1 className="text-2xl font-semibold text-white sm:text-3xl">
              {days.length}-Day Trip to {place}
            </h1>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-600">
        <span className="flex items-center gap-1.5">
          <Icon name="calendar" className="h-4 w-4 text-slate-400" /> {days.length} days
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="pin" className="h-4 w-4 text-slate-400" /> {uniqueCities.length}{' '}
          {uniqueCities.length === 1 ? 'city' : 'cities'}
        </span>
        <span className="flex items-center gap-1.5">
          <Icon name="sparkles" className="h-4 w-4 text-slate-400" /> {totalActivities} experiences
        </span>
        {trip?.budget && (
          <span className="flex items-center gap-1.5">
            <Icon name="wallet" className="h-4 w-4 text-slate-400" /> From {formatCurrency(trip.budget)}
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-slate-500">
          A preview plan for {place}. This isn't saved to your trip yet — tap a day to see the experiences, or an
          experience for more detail.
        </p>
        <button
          type="button"
          onClick={onRegenerate}
          className="flex-shrink-0 rounded-[50px] border border-slate-300 px-4 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          Regenerate
        </button>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          {days.map((day, i) => (
            <DayCard key={day.day} day={day} onClick={() => onOpenDay(i)} />
          ))}
        </div>

        <div className="lg:sticky lg:top-6 lg:h-fit">
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <MiniMap pins={cityPins} className="h-56 w-full lg:h-72" />
          </div>
        </div>
      </div>
    </div>
  )
}

function useCityPins(cities: string[]) {
  const [pins, setPins] = useState<{ lat: number; lon: number; label: string }[]>([])

  useEffect(() => {
    let cancelled = false
    async function run() {
      const results: { lat: number; lon: number; label: string }[] = []
      for (const city of cities) {
        const result = await geocode(city)
        if (result) results.push({ lat: result.lat, lon: result.lon, label: city })
      }
      if (!cancelled) setPins(results)
    }
    if (cities.length > 0) run()
    return () => {
      cancelled = true
    }
  }, [cities.join('|')])

  return pins
}

function DayCard({ day, onClick }: { day: ItineraryDay; onClick: () => void }) {
  const wikiImage = useDayImage(day)
  const image = wikiImage === undefined ? null : (wikiImage ?? imageForCategory(day.activities[0]?.category ?? ''))

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="h-20 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full animate-pulse bg-slate-100" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-600">Day {day.day}</span>
          {day.date && <span>{day.date}</span>}
          <span>· {day.activities.length} experiences</span>
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900">{day.theme ?? dayFallbackTheme(day)}</p>
      </div>
      <span className="flex-shrink-0 text-slate-300">›</span>
    </button>
  )
}

function DayView({
  itinerary,
  dayIndex,
  onOpenActivity,
}: {
  itinerary: ItineraryResult
  dayIndex: number
  onOpenActivity: (activityIndex: number) => void
}) {
  const day = itinerary.days[dayIndex]
  if (!day) return null

  return (
    <div>
      <p className="text-xs font-medium text-slate-500">
        {day.city} · {day.date}
      </p>
      <h1 className="mt-1 text-xl font-semibold text-slate-900">{day.theme ?? dayFallbackTheme(day)}</h1>
      <p className="mt-1 text-sm text-slate-500">{day.activities.length} experiences</p>

      <div className="mt-6 space-y-3">
        {day.activities.map((activity, i) => (
          <ActivityCard key={i} activity={activity} city={day.city} onClick={() => onOpenActivity(i)} />
        ))}
      </div>
    </div>
  )
}

function ActivityCard({
  activity,
  city,
  onClick,
}: {
  activity: ItineraryActivity
  city: string
  onClick: () => void
}) {
  const info = useActivityWikiInfo(activity.name, city)
  const image = info === undefined ? null : (info?.image ?? imageForCategory(activity.category))
  const { format: formatCurrency } = useCurrency()

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl border border-slate-100 bg-white p-3 text-left transition hover:border-slate-300 hover:shadow-sm"
    >
      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full animate-pulse bg-slate-100" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
          {activity.category}
        </span>
        <p className="mt-1 truncate text-sm font-semibold text-slate-900">{activity.name}</p>
        <p className="text-xs text-slate-500">
          {formatTime(activity.time)}
          {activity.estimated_cost > 0 && ` · ~${formatCurrency(activity.estimated_cost)}`}
        </p>
      </div>
      <span className="flex-shrink-0 text-slate-300">›</span>
    </button>
  )
}

function ActivityView({
  itinerary,
  dayIndex,
  activityIndex,
  onOpenActivity,
}: {
  itinerary: ItineraryResult
  dayIndex: number
  activityIndex: number
  onOpenActivity: (activityIndex: number) => void
}) {
  const day = itinerary.days[dayIndex]
  const activity = day?.activities[activityIndex]
  const info = useActivityWikiInfo(activity?.name, day?.city ?? '')
  const placeQuery = activity?.name ? extractPlaceQuery(activity.name) : null
  const geo = useGeocode(placeQuery && day ? `${placeQuery}, ${day.city}` : null)

  const { format: formatCurrency } = useCurrency()
  if (!day || !activity) return null

  const image = info?.image ?? imageForCategory(activity.category)

  return (
    <div>
      <div className="overflow-hidden rounded-2xl">
        <img src={image} alt={activity.name} className="h-64 w-full object-cover sm:h-80" />
      </div>

      <div className="mt-5">
        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
          {activity.category}
        </span>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{activity.name}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {day.city} · {formatTime(activity.time)}
          {activity.estimated_cost > 0 && ` · ~${formatCurrency(activity.estimated_cost)}`}
        </p>
      </div>

      {activity.best_time && (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
          <Icon name="clock" className="h-4 w-4" /> Best time to go: {activity.best_time}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Overview</h2>
          {info === undefined ? (
            <div className="mt-2 h-16 animate-pulse rounded-lg bg-slate-100" />
          ) : info?.extract ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{info.extract}</p>
              {info.url && (
                <a
                  href={info.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline"
                >
                  Read more on Wikipedia
                </a>
              )}
            </>
          ) : activity.tip ? (
            <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">💡 {activity.tip}</p>
          ) : (
            <p className="mt-2 text-sm text-slate-400">No further details found for this place.</p>
          )}

          {info?.extract && activity.tip && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">💡 {activity.tip}</p>
          )}
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-900">Location</h2>
          <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
            {geo === undefined ? (
              <div className="h-64 animate-pulse bg-slate-100" />
            ) : (
              <MiniMap
                pins={geo ? [{ lat: geo.lat, lon: geo.lon, label: activity.name }] : []}
                className="h-64 w-full"
              />
            )}
          </div>
        </div>
      </div>

      <ActivityReviews activityName={activity.name} city={day.city} />

      {day.activities.length > 1 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-slate-900">Similar experiences that day</h2>
          <div className="mt-3 space-y-3">
            {day.activities.map((other, i) =>
              i === activityIndex ? null : (
                <ActivityCard key={i} activity={other} city={day.city} onClick={() => onOpenActivity(i)} />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  )
}
