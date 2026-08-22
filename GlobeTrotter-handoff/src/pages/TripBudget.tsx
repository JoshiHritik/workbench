import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { AppHeader } from '../components/AppHeader'
import type { Trip } from '../lib/types'

interface CostLine {
  category: string
  cost: number
}

interface TripActivityCostRow {
  cost_override: number | null
  activities: { cost: number | null; category: string | null } | null
}

const BAR_COLORS = ['bg-slate-900', 'bg-slate-700', 'bg-slate-500', 'bg-slate-400', 'bg-slate-300']

export default function TripBudget() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [costsByCategory, setCostsByCategory] = useState<CostLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tripId) return

    async function load() {
      const { data: tripData } = await supabase.from('trips').select('*').eq('id', tripId).single()
      setTrip(tripData)

      const { data: stops } = await supabase.from('trip_stops').select('id').eq('trip_id', tripId)
      const stopIds = (stops ?? []).map((s) => s.id)

      if (stopIds.length > 0) {
        const { data: tripActivities } = await supabase
          .from('trip_activities')
          .select('cost_override, activities(cost, category)')
          .in('trip_stop_id', stopIds)

        const totals = new Map<string, number>()
        ;((tripActivities ?? []) as unknown as TripActivityCostRow[]).forEach((row) => {
          const category = row.activities?.category ?? 'Other'
          const cost = row.cost_override ?? row.activities?.cost ?? 0
          totals.set(category, (totals.get(category) ?? 0) + cost)
        })
        setCostsByCategory(Array.from(totals, ([category, cost]) => ({ category, cost })))
      }

      setLoading(false)
    }

    load()
  }, [tripId])

  const totalSpent = costsByCategory.reduce((sum, c) => sum + c.cost, 0)
  const maxCost = Math.max(...costsByCategory.map((c) => c.cost), 1)
  const budget = trip?.budget ?? null
  const overBudget = budget !== null && totalSpent > budget

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
        <Link to={`/trips/${trip.id}`} className="text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Back to {trip.name}
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Budget & Cost Breakdown</h1>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Budget</p>
            <p className="mt-1 text-2xl font-semibold text-slate-900">{budget !== null ? budget : '—'}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Estimated spend</p>
            <p className={`mt-1 text-2xl font-semibold ${overBudget ? 'text-red-600' : 'text-slate-900'}`}>
              {totalSpent > 0 ? totalSpent : '—'}
            </p>
          </div>
        </div>

        {overBudget && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            This trip is estimated to run over budget.
          </p>
        )}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Cost by category</h2>
          {costsByCategory.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No costed activities yet. Add activities to this trip's itinerary to see a breakdown here.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {costsByCategory.map((line, i) => (
                <div key={line.category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{line.category}</span>
                    <span className="text-slate-500">{line.cost}</span>
                  </div>
                  <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${BAR_COLORS[i % BAR_COLORS.length]}`}
                      style={{ width: `${(line.cost / maxCost) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
