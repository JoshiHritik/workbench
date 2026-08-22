import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { AppHeader } from '../components/AppHeader'
import { DateRangePicker } from '../components/DateRangePicker'
import { TripTypeSelect } from '../components/TripTypeSelect'
import { DropdownPortal } from '../components/DropdownPortal'
import { searchCities } from '../lib/citySearch'
import type { City, Trip } from '../lib/types'

const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=2000&q=80'

function formatDateRange(start: string | null, end: string | null) {
  if (!start || !end) return 'Dates not set'
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`
}

function CityThumbnail({ city, className }: { city: City; className: string }) {
  if (city.image_url) {
    return <img src={city.image_url} alt={city.name} className={`${className} object-cover`} />
  }
  return (
    <div className={`${className} flex items-center justify-center bg-slate-200 text-slate-400`}>
      <svg className="h-1/3 w-1/3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
      </svg>
    </div>
  )
}

function CityCard({ city, onClick }: { city: City; onClick: (city: City) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(city)}
      className="group relative h-64 w-52 flex-shrink-0 overflow-hidden rounded-2xl text-left shadow-md transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl"
    >
      <CityThumbnail
        city={city}
        className="absolute inset-0 h-full w-full scale-100 transition-transform duration-300 ease-out group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-xl font-bold leading-tight text-white">{city.name}</p>
        <p className="mt-1 text-xs text-white/80">
          {city.state ? `${city.state}, ` : ''}
          {city.country}
        </p>
      </div>
    </button>
  )
}

const CHEVRON_LEFT = 'M15 19l-7-7 7-7'
const CHEVRON_RIGHT = 'M9 5l7 7-7 7'

function ScrollArrow({ direction, onClick }: { direction: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Scroll ${direction}`}
      className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md transition hover:bg-slate-50 ${
        direction === 'left' ? '-left-4' : '-right-4'
      }`}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d={direction === 'left' ? CHEVRON_LEFT : CHEVRON_RIGHT}
        />
      </svg>
    </button>
  )
}

function CityCardRow({ cities, onSelectCity }: { cities: City[]; onSelectCity: (city: City) => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(direction: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: direction === 'left' ? -450 : 450, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <ScrollArrow direction="left" onClick={() => scroll('left')} />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-10 bg-gradient-to-r from-slate-50 to-transparent" />
      <div ref={scrollRef} className="scrollbar-none flex gap-5 overflow-x-auto scroll-smooth px-1 pb-2">
        {cities.map((city) => (
          <CityCard key={city.id} city={city} onClick={onSelectCity} />
        ))}
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-10 bg-gradient-to-l from-slate-50 to-transparent" />
      <ScrollArrow direction="right" onClick={() => scroll('right')} />
    </div>
  )
}

function tripStatusLabel(trip: Trip): { label: string; className: string } {
  if (trip.status === 'draft') {
    return { label: 'Draft', className: 'bg-amber-100 text-amber-700' }
  }
  const today = new Date().toISOString().slice(0, 10)
  if (trip.end_date && trip.end_date < today) {
    return { label: 'Completed', className: 'bg-slate-200 text-slate-600' }
  }
  return { label: 'Upcoming', className: 'bg-emerald-100 text-emerald-700' }
}

interface TripCardProps {
  trip: Trip
  stopCount: number
  onDuplicate: (trip: Trip) => void
  onDelete: (trip: Trip) => void
  onShare: (trip: Trip) => void
}

function TripCard({ trip, stopCount, onDuplicate, onDelete, onShare }: TripCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const status = tripStatusLabel(trip)

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      <div className="relative h-32 w-full bg-slate-100">
        {trip.cover_photo_url ? (
          <img src={trip.cover_photo_url} alt={trip.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <svg className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
            </svg>
          </div>
        )}
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
          {status.label}
        </span>

        <div className="absolute right-2 top-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setMenuOpen((v) => !v)
            }}
            aria-label="Trip options"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-600 shadow hover:bg-white"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="19" cy="12" r="1.5" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onDuplicate(trip)
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onShare(trip)
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Share
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false)
                    onDelete(trip)
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="p-4">
        <p className="font-medium text-slate-900">{trip.name}</p>
        <p className="mt-1 text-sm text-slate-500">{formatDateRange(trip.start_date, trip.end_date)}</p>
        <p className="mt-2 text-xs text-slate-400">
          {stopCount > 0 ? `${stopCount} stop${stopCount === 1 ? '' : 's'} planned` : 'No destinations added yet'}
          {' · Est. budget —'}
        </p>

        <div className="mt-3 flex gap-2">
          <Link
            to={`/trips/${trip.id}`}
            className="flex-1 rounded-[50px] border border-slate-300 px-3 py-2 text-center text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            View Details
          </Link>
          <Link
            to={`/trips/${trip.id}`}
            className="flex-1 rounded-[50px] bg-slate-900 px-3 py-2 text-center text-xs font-medium text-white hover:bg-slate-700"
          >
            Edit Itinerary
          </Link>
        </div>
      </div>
    </div>
  )
}

function StartJourneyCard() {
  return (
    <Link
      to="/create-trip"
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center transition hover:border-slate-400 hover:bg-slate-50"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-2xl leading-none text-slate-500">
        +
      </span>
      <p className="font-medium text-slate-900">Start a New Journey</p>
      <p className="text-xs text-slate-500">Plan your next adventure</p>
    </Link>
  )
}

const QUICK_ACTIONS = [
  { key: 'plan', label: 'Plan New Trip' },
  { key: 'city', label: 'Add City' },
  { key: 'activity', label: 'Find Activities' },
  { key: 'calendar', label: 'View Calendar' },
  { key: 'budget', label: 'Review Budget' },
  { key: 'share', label: 'Share Itinerary' },
] as const

export default function Dashboard() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [trips, setTrips] = useState<Trip[]>([])
  const [stopCounts, setStopCounts] = useState<Record<string, number>>({})
  const [featuredCities, setFeaturedCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)

  const searchAnchorRef = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<City[]>([])
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [persons, setPersons] = useState('')
  const [tripType, setTripType] = useState('')

  useEffect(() => {
    if (!session) return

    async function loadDashboard() {
      const [tripsRes, citiesRes] = await Promise.all([
        supabase
          .from('trips')
          .select('*')
          .eq('user_id', session!.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('cities')
          .select('*')
          .not('image_url', 'is', null)
          .order('popularity', { ascending: false })
          .limit(16),
      ])

      if (tripsRes.data) setTrips(tripsRes.data)
      if (citiesRes.data) setFeaturedCities(citiesRes.data)
      setLoading(false)
    }

    loadDashboard()
  }, [session])

  // Stop counts per trip, used for the "N stops planned" progress line on
  // each trip card. A separate lightweight query rather than joining into
  // the main trips fetch above.
  useEffect(() => {
    if (trips.length === 0) {
      setStopCounts({})
      return
    }
    async function loadStopCounts() {
      const { data } = await supabase
        .from('trip_stops')
        .select('trip_id')
        .in('trip_id', trips.map((t) => t.id))
      if (!data) return
      const counts: Record<string, number> = {}
      data.forEach((row: { trip_id: string }) => {
        counts[row.trip_id] = (counts[row.trip_id] || 0) + 1
      })
      setStopCounts(counts)
    }
    loadStopCounts()
  }, [trips])

  async function handleDuplicateTrip(trip: Trip) {
    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: session!.user.id,
        name: `${trip.name} (copy)`,
        start_date: trip.start_date,
        end_date: trip.end_date,
        description: trip.description,
        cover_photo_url: trip.cover_photo_url,
        is_public: false,
        status: 'draft',
      })
      .select()
      .single()
    if (!error && data) setTrips((prev) => [data, ...prev])
  }

  async function handleDeleteTrip(trip: Trip) {
    if (!window.confirm(`Delete "${trip.name}"? This can't be undone.`)) return
    const { error } = await supabase.from('trips').delete().eq('id', trip.id)
    if (!error) setTrips((prev) => prev.filter((t) => t.id !== trip.id))
  }

  async function handleShareTrip(trip: Trip) {
    const { data: existing } = await supabase.from('shared_links').select('*').eq('trip_id', trip.id).maybeSingle()
    let slug = existing?.public_slug
    if (!slug) {
      const { data, error } = await supabase.from('shared_links').insert({ trip_id: trip.id }).select().single()
      if (error || !data) {
        alert('Could not create a share link.')
        return
      }
      slug = data.public_slug
    }
    await navigator.clipboard.writeText(`${window.location.origin}/shared/${slug}`)
    alert('Share link copied to clipboard.')
  }

  function buildCreateTripUrl() {
    const params = new URLSearchParams()
    if (search.trim()) params.set('destination', search.trim())
    if (fromDate) params.set('start', fromDate)
    if (toDate) params.set('end', toDate)
    const query = params.toString()
    return query ? `/create-trip?${query}` : '/create-trip'
  }

  // With a destination typed in, "Search" takes the user to that city's page
  // first (things to do, a real map) rather than straight into trip creation.
  // With nothing typed, there's no city to explore, so it falls back to
  // starting a blank trip — same as before.
  function buildSearchUrl() {
    if (!search.trim()) return buildCreateTripUrl()
    const params = new URLSearchParams()
    params.set('name', search.trim())
    if (fromDate) params.set('start', fromDate)
    if (toDate) params.set('end', toDate)
    return `/cities?${params.toString()}`
  }

  function handleQuickAction(key: string) {
    const firstTripId = trips[0]?.id
    switch (key) {
      case 'plan':
        navigate(buildCreateTripUrl())
        break
      case 'city':
        navigate('/cities')
        break
      case 'activity':
        navigate('/activities')
        break
      case 'calendar':
        navigate(firstTripId ? `/trips/${firstTripId}/calendar` : '/create-trip')
        break
      case 'budget':
        navigate(firstTripId ? `/trips/${firstTripId}/budget` : '/create-trip')
        break
      case 'share':
        if (trips[0]) handleShareTrip(trips[0])
        else navigate('/create-trip')
        break
    }
  }

  // Live search against the full world-cities table (server-side — there are
  // ~90k rows, far too many to ever load into the browser).
  useEffect(() => {
    const query = search.trim()
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    let cancelled = false
    const timeout = setTimeout(async () => {
      const results = await searchCities(query)
      if (!cancelled) setSuggestions(results)
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [search])

  const today = new Date().toISOString().slice(0, 10)
  const draftTrips = trips.filter((t) => t.status === 'draft')
  const upcomingTrips = trips.filter((t) => t.status !== 'draft' && (!t.end_date || t.end_date >= today))
  const completedTrips = trips.filter((t) => t.status !== 'draft' && t.end_date && t.end_date < today)
  const nextTrip = upcomingTrips
    .filter((t) => t.start_date && t.start_date >= today)
    .sort((a, b) => (a.start_date! < b.start_date! ? -1 : 1))[0]
  const nextTripDays = nextTrip?.start_date
    ? Math.ceil((new Date(nextTrip.start_date).getTime() - new Date(today).getTime()) / 86400000)
    : null
  const firstTripId = trips[0]?.id

  return (
    <div className="min-h-svh bg-slate-50">
      <div className="relative isolate flex h-[75svh] flex-col">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img src={HERO_IMAGE_URL} alt="" className="h-full w-full scale-105 object-cover blur-[2px]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-slate-50" />
        </div>

        <AppHeader />

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 sm:px-6">
          <div className="text-center text-white drop-shadow-md">
            <h1 className="text-3xl font-bold sm:text-4xl">Where to next?</h1>
            <p className="mt-2 text-sm text-white/90">Search 90,000+ cities worldwide</p>
          </div>

          <div className="mx-auto w-full max-w-5xl">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-10 shadow-lg backdrop-blur-sm">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative w-full flex-1" ref={searchAnchorRef}>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
                    placeholder="Search destinations…"
                    className="w-full rounded-[50px] border border-slate-300 px-5 py-3.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                  />
                  {searchFocused && suggestions.length > 0 && (
                    <DropdownPortal anchorRef={searchAnchorRef}>
                      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                        {suggestions.map((city) => (
                          <button
                            key={city.id}
                            type="button"
                            onMouseDown={() => setSearch(city.name)}
                            className="flex w-full items-center gap-3 px-4 py-2 text-left hover:bg-slate-50"
                          >
                            <CityThumbnail city={city} className="h-12 w-12 flex-shrink-0 rounded-lg" />
                            <div>
                              <p className="font-medium text-slate-900">{city.name}</p>
                              <p className="text-xs text-slate-500">
                                {city.state ? `${city.state}, ` : ''}
                                {city.country}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </DropdownPortal>
                  )}
                </div>
                <Link
                  to={buildSearchUrl()}
                  className="flex flex-shrink-0 items-center justify-center rounded-[50px] bg-slate-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  Search
                </Link>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="sm:flex-1">
                  <DateRangePicker
                    startDate={fromDate}
                    endDate={toDate}
                    onChange={(start, end) => {
                      setFromDate(start)
                      setToDate(end)
                    }}
                  />
                </div>
                <input
                  type="number"
                  min={1}
                  value={persons}
                  onChange={(e) => setPersons(e.target.value)}
                  placeholder="Persons"
                  className="rounded-[50px] border border-slate-300 px-5 py-3.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 sm:flex-1"
                />
                <div className="sm:flex-1">
                  <TripTypeSelect value={tripType} onChange={setTripType} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 pb-10 pt-10 sm:px-6">
        {!loading && trips.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-slate-900">Trip summary</h2>
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Total trips</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{trips.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Upcoming</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{upcomingTrips.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Drafts</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{draftTrips.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs text-slate-500">Completed</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{completedTrips.length}</p>
              </div>
            </div>
            {nextTrip && nextTripDays !== null && (
              <p className="mt-3 text-sm text-slate-600">
                <span className="font-medium text-slate-900">{nextTrip.name}</span> starts in {nextTripDays} day
                {nextTripDays === 1 ? '' : 's'}.
              </p>
            )}
          </section>
        )}

        <section className={trips.length > 0 ? 'mt-10' : undefined}>
          <h2 className="text-lg font-semibold text-slate-900">Popular Destinations</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading…</p>
          ) : featuredCities.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No cities yet.</p>
          ) : (
            <div className="mt-3">
              <CityCardRow
                cities={featuredCities}
                onSelectCity={(city) => {
                  const params = new URLSearchParams({ name: city.name })
                  if (fromDate) params.set('start', fromDate)
                  if (toDate) params.set('end', toDate)
                  navigate(`/cities?${params.toString()}`)
                }}
              />
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Your trips</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading…</p>
          ) : trips.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <p className="text-sm text-slate-500">You haven't planned any trips yet.</p>
              <Link
                to="/create-trip"
                className="mt-3 inline-block text-sm font-medium text-slate-900 hover:underline"
              >
                Plan your first trip
              </Link>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {draftTrips.length > 0 && draftTrips.length === trips.length && (
                <p className="col-span-full text-sm text-amber-700">
                  All your trips are still drafts. Continue planning to lock in dates and destinations.
                </p>
              )}
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  stopCount={stopCounts[trip.id] ?? 0}
                  onDuplicate={handleDuplicateTrip}
                  onDelete={handleDeleteTrip}
                  onShare={handleShareTrip}
                />
              ))}
              <StartJourneyCard />
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Quick actions</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => handleQuickAction(action.key)}
                className="rounded-[50px] border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                {action.label}
              </button>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Budget highlights</h2>
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Trips planned</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{trips.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Estimated total spend</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">—</p>
              <p className="mt-1 text-xs text-slate-400">Add activities to a trip to see cost estimates</p>
            </div>
          </div>
          <Link
            to={firstTripId ? `/trips/${firstTripId}/budget` : '/create-trip'}
            className="mt-4 inline-block text-sm font-medium text-slate-900 hover:underline"
          >
            View Full Budget
          </Link>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-slate-900">Upcoming events</h2>
          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
            <p className="text-sm text-slate-500">No upcoming events yet.</p>
            <p className="mt-1 text-xs text-slate-400">Add activities to your itinerary to see them here.</p>
          </div>
        </section>
      </main>
    </div>
  )
}
