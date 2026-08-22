import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { AppHeader } from '../components/AppHeader'
import type { Trip } from '../lib/types'

interface ItineraryActivity {
  time: string
  name: string
  category: string
  estimated_cost: number
}

interface ItineraryDay {
  day: number
  date: string
  city: string
  activities: ItineraryActivity[]
}

interface ItineraryResult {
  days: ItineraryDay[]
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start || !end) return 'Dates not set'
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`
}

export default function TripDetail() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [itinerary, setItinerary] = useState<ItineraryResult | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)

  useEffect(() => {
    if (!tripId) return
    async function loadTrip() {
      const { data } = await supabase.from('trips').select('*').eq('id', tripId).single()
      setTrip(data)
      setLoading(false)
    }
    loadTrip()
  }, [tripId])

  async function handleGenerate() {
    if (!trip) return
    setGenerating(true)
    setAiError(null)
    setItinerary(null)

    const { data, error } = await supabase.functions.invoke('generate-itinerary', {
      body: {
        destination: trip.name,
        startDate: trip.start_date,
        endDate: trip.end_date,
        budget: trip.budget,
        tripVibe: trip.trip_vibe,
        description: trip.description,
      },
    })

    setGenerating(false)

    if (error || data?.error) {
      setAiError(error?.message || data?.error || 'Something went wrong generating the itinerary.')
      return
    }

    setItinerary(data as ItineraryResult)
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
          {trip.budget && <span className="rounded-full bg-white px-3 py-1 shadow-sm">Budget: {trip.budget}</span>}
        </div>

        {trip.description && <p className="mt-4 text-sm text-slate-600">{trip.description}</p>}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Itinerary</h2>
              <p className="mt-1 text-sm text-slate-500">
                No cities or activities added yet. Let AI suggest a starting plan.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="flex-shrink-0 rounded-[50px] bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? 'Generating…' : 'Generate with AI'}
            </button>
          </div>

          {aiError && (
            <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {aiError}
            </p>
          )}

          {itinerary && (
            <div className="mt-6 space-y-6">
              <p className="text-xs text-slate-400">
                AI-suggested plan — a preview only, not yet saved to this trip.
              </p>
              {itinerary.days.map((day) => (
                <div key={day.day} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
                  <p className="font-medium text-slate-900">
                    Day {day.day} · {day.city}
                    {day.date && <span className="ml-2 text-xs text-slate-400">{day.date}</span>}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {day.activities.map((activity, i) => (
                      <li key={i} className="flex items-start justify-between text-sm">
                        <div>
                          <span className="font-medium text-slate-700">{activity.time}</span>{' '}
                          <span className="text-slate-700">{activity.name}</span>
                          <span className="ml-2 text-xs text-slate-400">{activity.category}</span>
                        </div>
                        {activity.estimated_cost > 0 && (
                          <span className="flex-shrink-0 text-xs text-slate-400">~{activity.estimated_cost}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
