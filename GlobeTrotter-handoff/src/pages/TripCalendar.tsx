import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { AppHeader } from '../components/AppHeader'
import type { Trip } from '../lib/types'

interface TimelineEvent {
  id: string
  date: string | null
  time: string | null
  activityName: string
  cityName: string | null
}

interface StopRow {
  id: string
  cities: { name: string } | null
}

interface TripActivityRow {
  id: string
  scheduled_date: string | null
  scheduled_time: string | null
  trip_stop_id: string
  activities: { name: string } | null
}

export default function TripCalendar() {
  const { tripId } = useParams()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tripId) return

    async function load() {
      const { data: tripData } = await supabase.from('trips').select('*').eq('id', tripId).single()
      setTrip(tripData)

      const { data: stops } = await supabase
        .from('trip_stops')
        .select('id, cities(name)')
        .eq('trip_id', tripId)

      const stopMap = new Map(
        ((stops ?? []) as unknown as StopRow[]).map((s) => [s.id, s.cities?.name ?? null]),
      )
      const stopIds = Array.from(stopMap.keys())

      if (stopIds.length > 0) {
        const { data: activities } = await supabase
          .from('trip_activities')
          .select('id, scheduled_date, scheduled_time, trip_stop_id, activities(name)')
          .in('trip_stop_id', stopIds)
          .order('scheduled_date', { ascending: true })
          .order('scheduled_time', { ascending: true })

        setEvents(
          ((activities ?? []) as unknown as TripActivityRow[]).map((row) => ({
            id: row.id,
            date: row.scheduled_date,
            time: row.scheduled_time,
            activityName: row.activities?.name ?? 'Activity',
            cityName: stopMap.get(row.trip_stop_id) ?? null,
          })),
        )
      }

      setLoading(false)
    }

    load()
  }, [tripId])

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

  const eventsByDate = new Map<string, TimelineEvent[]>()
  events.forEach((event) => {
    const key = event.date ?? 'Unscheduled'
    eventsByDate.set(key, [...(eventsByDate.get(key) ?? []), event])
  })

  return (
    <div className="min-h-svh bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <Link to={`/trips/${trip.id}`} className="text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Back to {trip.name}
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-slate-900">Trip Calendar</h1>
        <p className="mt-1 text-sm text-slate-500">Day-by-day timeline for {trip.name}.</p>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          {eventsByDate.size === 0 ? (
            <p className="text-sm text-slate-500">
              No scheduled activities yet. Add activities with dates to this trip to see them here.
            </p>
          ) : (
            <div className="space-y-6">
              {Array.from(eventsByDate.entries()).map(([date, dayEvents]) => (
                <div key={date} className="border-t border-slate-100 pt-4 first:border-0 first:pt-0">
                  <p className="font-medium text-slate-900">
                    {date === 'Unscheduled'
                      ? 'Unscheduled'
                      : new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                  </p>
                  <ul className="mt-2 space-y-2">
                    {dayEvents.map((event) => (
                      <li key={event.id} className="flex items-center gap-3 text-sm">
                        {event.time && <span className="w-14 flex-shrink-0 text-slate-400">{event.time}</span>}
                        <span className="text-slate-700">{event.activityName}</span>
                        {event.cityName && <span className="text-xs text-slate-400">· {event.cityName}</span>}
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
