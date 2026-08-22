import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { AppHeader } from '../components/AppHeader'
import { DateRangePicker } from '../components/DateRangePicker'
import { DropdownPortal } from '../components/DropdownPortal'
import { formatCurrency } from '../lib/format'
import type { City, Trip, TripStop } from '../lib/types'

interface StopWithCity extends TripStop {
  cities: City
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start || !end) return 'Dates not set'
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`
}

export default function TripDetail() {
  const { tripId } = useParams()
  const { session } = useAuth()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)

  const [stops, setStops] = useState<StopWithCity[]>([])
  const [citySearch, setCitySearch] = useState('')
  const [citySuggestions, setCitySuggestions] = useState<City[]>([])
  const [citySearchFocused, setCitySearchFocused] = useState(false)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [stopStartDate, setStopStartDate] = useState('')
  const [stopEndDate, setStopEndDate] = useState('')
  const [addingStop, setAddingStop] = useState(false)
  const [stopError, setStopError] = useState<string | null>(null)
  const citySearchAnchorRef = useRef<HTMLDivElement>(null)

  const isOwner = session?.user.id === trip?.user_id

  useEffect(() => {
    if (!tripId) return
    async function loadTrip() {
      const { data } = await supabase.from('trips').select('*').eq('id', tripId).single()
      setTrip(data)
      setLoading(false)
    }
    loadTrip()
  }, [tripId])

  async function loadStops() {
    if (!tripId) return
    const { data } = await supabase
      .from('trip_stops')
      .select('*, cities(*)')
      .eq('trip_id', tripId)
      .order('order_index', { ascending: true })
    setStops((data as unknown as StopWithCity[]) ?? [])
  }

  useEffect(() => {
    loadStops()
  }, [tripId])

  useEffect(() => {
    const query = citySearch.trim()
    if (query.length < 2) {
      setCitySuggestions([])
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
      if (!cancelled && data) setCitySuggestions(data)
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [citySearch])

  async function handleAddStop() {
    if (!tripId) return
    if (!selectedCity) {
      setStopError('Pick a city from the suggestions first.')
      return
    }
    setStopError(null)
    setAddingStop(true)

    const { error } = await supabase.from('trip_stops').insert({
      trip_id: tripId,
      city_id: selectedCity.id,
      arrival_date: stopStartDate || null,
      departure_date: stopEndDate || null,
      order_index: stops.length,
    })

    setAddingStop(false)

    if (error) {
      setStopError(error.message)
      return
    }

    setCitySearch('')
    setSelectedCity(null)
    setStopStartDate('')
    setStopEndDate('')
    loadStops()
  }

  async function handleRemoveStop(stopId: string) {
    await supabase.from('trip_stops').delete().eq('id', stopId)
    loadStops()
  }

  if (loading) {
    return (
      <div className="min-h-svh bg-slate-50">
        <AppHeader />
        <p className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-slate-500">Loading…</p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="min-h-svh bg-slate-50">
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-xl font-semibold text-slate-900">Trip not found</h1>
          <Link to="/dashboard" className="mt-6 inline-block text-sm font-medium text-slate-900 hover:underline">
            Back to dashboard
          </Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link to="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Back to dashboard
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-slate-900">{trip.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{formatDateRange(trip.start_date, trip.end_date)}</p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          {trip.trip_vibe && <span className="rounded-full bg-white px-3 py-1 shadow-sm">{trip.trip_vibe}</span>}
          {trip.budget && (
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">Budget: {formatCurrency(trip.budget)}</span>
          )}
        </div>

        {trip.description && <p className="mt-4 text-sm text-slate-600">{trip.description}</p>}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Stops</h2>

          {stops.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">No stops added yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {stops.map((stop) => (
                <li
                  key={stop.id}
                  className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {stop.cities.name}
                      <span className="ml-1 text-xs font-normal text-slate-400">
                        {stop.cities.state ? `${stop.cities.state}, ` : ''}
                        {stop.cities.country}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">{formatDateRange(stop.arrival_date, stop.departure_date)}</p>
                  </div>
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleRemoveStop(stop.id)}
                      aria-label={`Remove ${stop.cities.name}`}
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
                      </svg>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {isOwner && (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <div className="relative" ref={citySearchAnchorRef}>
                <input
                  type="text"
                  value={selectedCity ? `${selectedCity.name}, ${selectedCity.country}` : citySearch}
                  onChange={(e) => {
                    setCitySearch(e.target.value)
                    setSelectedCity(null)
                  }}
                  onFocus={() => setCitySearchFocused(true)}
                  onBlur={() => setTimeout(() => setCitySearchFocused(false), 150)}
                  placeholder="Search a city to add…"
                  className="w-full rounded-[50px] border border-slate-300 px-5 py-3 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                />
                {citySearchFocused && !selectedCity && citySuggestions.length > 0 && (
                  <DropdownPortal anchorRef={citySearchAnchorRef}>
                    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                      {citySuggestions.map((city) => (
                        <button
                          key={city.id}
                          type="button"
                          onMouseDown={() => {
                            setSelectedCity(city)
                            setCitySuggestions([])
                          }}
                          className="block w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                        >
                          <span className="font-medium text-slate-900">{city.name}</span>
                          <span className="ml-1 text-xs text-slate-400">
                            {city.state ? `${city.state}, ` : ''}
                            {city.country}
                          </span>
                        </button>
                      ))}
                    </div>
                  </DropdownPortal>
                )}
              </div>

              <div className="mt-3">
                <DateRangePicker
                  startDate={stopStartDate}
                  endDate={stopEndDate}
                  onChange={(start, end) => {
                    setStopStartDate(start)
                    setStopEndDate(end)
                  }}
                />
              </div>

              {stopError && (
                <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {stopError}
                </p>
              )}

              <button
                type="button"
                onClick={handleAddStop}
                disabled={addingStop}
                className="mt-3 w-full appearance-none rounded-[50px] bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addingStop ? 'Adding…' : '+ Add stop'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Itinerary</h2>
              <p className="mt-1 text-sm text-slate-500">
                No cities or activities added yet. Let AI suggest a starting plan.
              </p>
            </div>
            <Link
              to={`/trips/${trip.id}/generate`}
              className="flex-shrink-0 rounded-[50px] bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700"
            >
              Generate with AI
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
