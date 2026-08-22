import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { AppHeader } from '../components/AppHeader'
import type { City, Trip } from '../lib/types'

function formatDateRange(start: string | null, end: string | null) {
  if (!start || !end) return 'Dates not set'
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`
}

export default function Dashboard() {
  const { session } = useAuth()
  const [trips, setTrips] = useState<Trip[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)

  const name = (session?.user.user_metadata?.full_name as string | undefined) || session?.user.email

  useEffect(() => {
    if (!session) return

    async function loadDashboard() {
      const [tripsRes, citiesRes] = await Promise.all([
        supabase
          .from('trips')
          .select('*')
          .eq('user_id', session!.user.id)
          .order('created_at', { ascending: false }),
        supabase.from('cities').select('*').order('popularity', { ascending: false }).limit(6),
      ])

      if (tripsRes.data) setTrips(tripsRes.data)
      if (citiesRes.data) setCities(citiesRes.data)
      setLoading(false)
    }

    loadDashboard()
  }, [session])

  return (
    <div className="min-h-svh bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Welcome back{name ? `, ${name}` : ''}</h1>
            <p className="mt-1 text-sm text-slate-500">Here's what's happening with your trips.</p>
          </div>
          <Link
            to="/create-trip"
            className="rounded-[50px] bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            + Plan New Trip
          </Link>
        </div>

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
          <h2 className="text-lg font-semibold text-slate-900">Recommended destinations</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading…</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {cities.map((city) => (
                <div key={city.id} className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                  <p className="font-medium text-slate-900">{city.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{city.country}</p>
                </div>
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
