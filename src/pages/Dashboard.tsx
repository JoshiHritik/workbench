import { useEffect, useState } from 'react'
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

function CityCard({ city }: { city: City }) {
  return (
    <div className="w-36 flex-shrink-0 rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
      <p className="font-medium text-slate-900">{city.name}</p>
      <p className="mt-1 text-xs text-slate-500">{city.country}</p>
    </div>
  )
}

export default function Dashboard() {
  const { session } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState('')
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
        supabase.from('cities').select('*').order('popularity', { ascending: false }),
      ])

      if (tripsRes.data) setTrips(tripsRes.data)
      if (citiesRes.data) setCities(citiesRes.data)
      setLoading(false)
    }

    loadDashboard()
  }, [session])

  const query = search.trim().toLowerCase()
  const matchesSearch = (city: City) =>
    !query || city.name.toLowerCase().includes(query) || city.country.toLowerCase().includes(query)

  const indiaCities = cities.filter((c) => c.country === 'India' && matchesSearch(c))
  const internationalCities = cities.filter((c) => c.country !== 'India' && matchesSearch(c))

  return (
    <div className="min-h-svh bg-slate-50">
      <div className="relative isolate flex min-h-svh flex-col overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <img src={HERO_IMAGE_URL} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-white/55" />
        </div>

        <AppHeader />

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
            <div className="rounded-2xl border border-slate-200 bg-white/95 p-8 shadow-lg backdrop-blur-sm">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search destinations…"
                  className="w-full flex-1 rounded-[50px] border border-slate-300 px-5 py-3.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                />
                <Link
                  to="/create-trip"
                  className="flex flex-shrink-0 items-center justify-center rounded-[50px] bg-slate-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700"
                >
                  + Plan New Trip
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
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
            <p className="mt-3 text-sm text-slate-500">No matching cities.</p>
          ) : (
            <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
              {indiaCities.map((city) => (
                <CityCard key={city.id} city={city} />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">International Cities</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading…</p>
          ) : internationalCities.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No matching cities.</p>
          ) : (
            <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
              {internationalCities.map((city) => (
                <CityCard key={city.id} city={city} />
              ))}
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
