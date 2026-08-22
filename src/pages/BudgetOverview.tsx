import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { AppHeader } from '../components/AppHeader'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import { loadCachedItinerary } from '../lib/itineraryCache'
import type { Trip } from '../lib/types'

interface TripSpend {
  trip: Trip
  estimated: number
}

const BAR_COLORS = ['bg-slate-900', 'bg-slate-700', 'bg-slate-500', 'bg-slate-400', 'bg-slate-300']

export default function BudgetOverview() {
  const { session } = useAuth()
  const { format: formatCurrency } = useCurrency()
  const [tripSpends, setTripSpends] = useState<TripSpend[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    async function load() {
      const { data } = await supabase.from('trips').select('*').eq('user_id', session!.user.id).order('created_at', { ascending: false })
      const trips = (data ?? []) as Trip[]
      const spends: TripSpend[] = trips.map((trip) => {
        const cached = loadCachedItinerary(trip.id)
        const estimated = cached
          ? cached.days.reduce((sum, day) => sum + day.activities.reduce((s, a) => s + (a.estimated_cost || 0), 0), 0)
          : 0
        return { trip, estimated }
      })
      setTripSpends(spends)
      setLoading(false)
    }
    load()
  }, [session])

  const totalEstimated = tripSpends.reduce((sum, t) => sum + t.estimated, 0)
  const totalBudget = tripSpends.reduce((sum, t) => sum + (t.trip.budget || 0), 0)
  const maxSpend = Math.max(...tripSpends.map((t) => t.estimated), 1)

  return (
    <div className="min-h-svh bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link to="/dashboard" className="text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Back to Dashboard
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Budget Overview</h1>
        <p className="mt-1 text-sm text-slate-500">Estimated spend across every trip, from each trip's AI itinerary.</p>

        {loading ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : tripSpends.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">No trips yet.</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total budget set</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{totalBudget > 0 ? formatCurrency(totalBudget) : '—'}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">Total estimated spend</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{totalEstimated > 0 ? formatCurrency(totalEstimated) : '—'}</p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900">Trip-wise breakdown</h2>
              <div className="mt-4 space-y-4">
                {tripSpends.map(({ trip, estimated }, i) => {
                  const overBudget = trip.budget !== null && estimated > trip.budget
                  return (
                    <Link key={trip.id} to={`/trips/${trip.id}/budget`} className="block">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-800">{trip.name}</span>
                        <span className={overBudget ? 'text-red-600' : 'text-slate-500'}>
                          {estimated > 0 ? formatCurrency(estimated) : 'No itinerary yet'}
                          {trip.budget ? ` / ${formatCurrency(trip.budget)}` : ''}
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${overBudget ? 'bg-red-500' : BAR_COLORS[i % BAR_COLORS.length]}`}
                          style={{ width: `${Math.min((estimated / maxSpend) * 100, 100)}%` }}
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
