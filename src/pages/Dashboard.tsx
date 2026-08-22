import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { AppHeader } from '../components/AppHeader'
import type { City, Trip } from '../lib/types'

const TRIP_TYPES = ['Friendly', 'Couple', 'Family', 'Solo']

const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80'

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

function CityCard({ city }: { city: City }) {
  return (
    <div className="relative h-64 w-52 flex-shrink-0 overflow-hidden rounded-2xl shadow-md">
      <CityThumbnail city={city} className="absolute inset-0 h-full w-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-4">
        <p className="text-xl font-bold leading-tight text-white">{city.name}</p>
        <p className="mt-1 text-xs text-white/80">
          {city.state ? `${city.state}, ` : ''}
          {city.country}
        </p>
      </div>
    </div>
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

function CityCardRow({ cities }: { cities: City[] }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  function scroll(direction: 'left' | 'right') {
    scrollRef.current?.scrollBy({ left: direction === 'left' ? -450 : 450, behavior: 'smooth' })
  }

  return (
    <div className="relative">
      <ScrollArrow direction="left" onClick={() => scroll('left')} />
      <div ref={scrollRef} className="scrollbar-none flex gap-5 overflow-x-auto scroll-smooth px-1 pb-2">
        {cities.map((city) => (
          <CityCard key={city.id} city={city} />
        ))}
      </div>
      <ScrollArrow direction="right" onClick={() => scroll('right')} />
    </div>
  )
}

export default function Dashboard() {
  const { session } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [indiaCities, setIndiaCities] = useState<City[]>([])
  const [internationalCities, setInternationalCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)

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
      const [tripsRes, indiaRes, intlRes] = await Promise.all([
        supabase
          .from('trips')
          .select('*')
          .eq('user_id', session!.user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('cities')
          .select('*')
          .eq('country', 'India')
          .not('image_url', 'is', null)
          .order('popularity', { ascending: false })
          .limit(8),
        supabase
          .from('cities')
          .select('*')
          .neq('country', 'India')
          .not('image_url', 'is', null)
          .order('popularity', { ascending: false })
          .limit(8),
      ])

      if (tripsRes.data) setTrips(tripsRes.data)
      if (indiaRes.data) setIndiaCities(indiaRes.data)
      if (intlRes.data) setInternationalCities(intlRes.data)
      setLoading(false)
    }

    loadDashboard()
  }, [session])

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
      const { data } = await supabase
        .from('cities')
        .select('*')
        .ilike('name', `%${query}%`)
        .order('popularity', { ascending: false })
        .limit(6)
      if (!cancelled && data) setSuggestions(data)
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [search])

  return (
    <div className="min-h-svh bg-slate-50">
      <div className="relative isolate flex h-[70svh] flex-col overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={HERO_IMAGE_URL} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-white/55" />
        </div>

        <AppHeader />

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-10 shadow-lg backdrop-blur-sm">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative w-full flex-1">
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
                    <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
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
                  )}
                </div>
                <Link
                  to="/create-trip"
                  className="flex flex-shrink-0 items-center justify-center rounded-[50px] bg-slate-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  + Plan New Trip
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-[50px] border border-slate-300 px-2">
                  <input
                    aria-label="From date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="rounded-[50px] px-2 py-2 text-sm outline-none"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    aria-label="To date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="rounded-[50px] px-2 py-2 text-sm outline-none"
                  />
                </div>
                <input
                  type="number"
                  min={1}
                  value={persons}
                  onChange={(e) => setPersons(e.target.value)}
                  placeholder="Persons"
                  className="w-28 rounded-[50px] border border-slate-300 px-4 py-2 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                />
                <select
                  value={tripType}
                  onChange={(e) => setTripType(e.target.value)}
                  className="rounded-[50px] border border-slate-300 px-4 py-2 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                >
                  <option value="">Trip type</option>
                  {TRIP_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 pb-10 pt-8 sm:px-6">
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Popular in India</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading…</p>
          ) : indiaCities.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No cities yet.</p>
          ) : (
            <div className="mt-3">
              <CityCardRow cities={indiaCities} />
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">International Cities</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading…</p>
          ) : internationalCities.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No cities yet.</p>
          ) : (
            <div className="mt-3">
              <CityCardRow cities={internationalCities} />
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
              {trips.map((trip) => (
                <Link
                  key={trip.id}
                  to={`/trips/${trip.id}`}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                >
                  <p className="font-medium text-slate-900">{trip.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{formatDateRange(trip.start_date, trip.end_date)}</p>
                </Link>
              ))}
            </div>
          )}
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
        </section>
      </main>
    </div>
  )
}
