import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { formatCurrency } from '../lib/format'
import type { Trip } from '../lib/types'

interface ItineraryActivity {
  time: string
  name: string
  category: string
  estimated_cost: number
  tip?: string
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

const DEFAULT_DAY_IMAGE =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=70'

// Per-activity images are matched by category, not by the specific AI-suggested
// venue — we have no way to verify or fetch a real photo of an unverified named
// place, and showing a random stock photo while implying it's that exact venue
// would be misleading. This is honest: "here's what a food outing looks like",
// not "here's a photo of Cafe Bombay".
const CATEGORY_IMAGES: Record<string, string> = {
  food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=70',
  sightseeing: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=400&q=70',
  culture: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=400&q=70',
  adventure: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=400&q=70',
  relaxation: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=70',
  beach: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=400&q=70',
  nightlife: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=400&q=70',
  shopping: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=400&q=70',
}

function imageForCategory(category: string) {
  const key = category.trim().toLowerCase()
  return CATEGORY_IMAGES[key] ?? DEFAULT_DAY_IMAGE
}

function destinationLabel(name: string) {
  return name.replace(/\s+trip$/i, '').trim() || name
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

export default function GenerateItinerary() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [phase, setPhase] = useState<'loading' | 'done' | 'error'>('loading')
  const [itinerary, setItinerary] = useState<ItineraryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [messageIndex, setMessageIndex] = useState(0)
  const [cityImages, setCityImages] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!tripId) return
    let cancelled = false

    async function run() {
      const { data: tripData } = await supabase.from('trips').select('*').eq('id', tripId).single()
      if (cancelled) return
      setTrip(tripData)

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

      if (cancelled) return

      if (fnError || data?.error) {
        setError(fnError?.message || data?.error || 'Something went wrong generating the itinerary.')
        setPhase('error')
        return
      }

      const result = data as ItineraryResult
      setItinerary(result)
      setPhase('done')

      const uniqueCities = Array.from(new Set(result.days.map((d) => d.city).filter(Boolean)))
      if (uniqueCities.length > 0) {
        const { data: cityRows } = await supabase
          .from('cities')
          .select('name, image_url')
          .in(
            'name',
            uniqueCities.map((c) => c.split(',')[0].trim()),
          )
          .not('image_url', 'is', null)
        if (cityRows) {
          const map: Record<string, string> = {}
          cityRows.forEach((row: { name: string; image_url: string | null }) => {
            if (row.image_url) map[row.name.toLowerCase()] = row.image_url
          })
          setCityImages(map)
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [tripId])

  useEffect(() => {
    if (phase !== 'loading') return
    const interval = setInterval(() => setMessageIndex((i) => i + 1), 1800)
    return () => clearInterval(interval)
  }, [phase])

  const place = trip ? destinationLabel(trip.name) : 'your destination'
  const messages = [
    `Figuring out the best places to dine in ${place}…`,
    `Finding spots great for ${trip?.trip_vibe ? `${trip.trip_vibe.toLowerCase()} travelers` : 'your trip'}…`,
    'Mapping out a day-by-day plan…',
    trip?.budget ? `Keeping things within ${formatCurrency(trip.budget)}…` : 'Balancing cost and experience…',
    'Putting together your itinerary…',
  ]

  function imageForCity(city: string) {
    const key = city.split(',')[0].trim().toLowerCase()
    return cityImages[key] ?? DEFAULT_DAY_IMAGE
  }

  if (phase === 'loading') {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-white px-4 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-200 border-t-slate-900" />
        <p key={messageIndex} className="fade-in-text mt-6 max-w-sm text-sm text-slate-500">
          {messages[messageIndex % messages.length]}
        </p>
      </div>
    )
  }

  if (phase === 'error') {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-white px-4 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <Link
          to={tripId ? `/trips/${tripId}` : '/dashboard'}
          className="mt-6 text-sm font-medium text-slate-900 hover:underline"
        >
          ← Back to trip
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-white">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <button
          type="button"
          onClick={() => navigate(tripId ? `/trips/${tripId}` : '/dashboard')}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Back to trip
        </button>

        <h1 className="mt-4 text-2xl font-semibold text-slate-900">Your suggested itinerary</h1>
        <p className="mt-1 text-sm text-slate-500">
          A starting plan for {place}. This is a preview — it isn't saved to your trip yet.
        </p>

        <div className="mt-8 space-y-10">
          {itinerary?.days.map((day) => (
            <div key={day.day} className="overflow-hidden rounded-2xl border border-slate-200">
              <div className="relative h-36 w-full">
                <img src={imageForCity(day.city)} alt={day.city} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <p className="absolute bottom-3 left-4 text-lg font-semibold text-white">
                  Day {day.day} · {day.city}
                  {day.date && <span className="ml-2 text-sm font-normal text-white/80">{day.date}</span>}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
                {day.activities.map((activity, i) => (
                  <div key={i} className="overflow-hidden rounded-xl border border-slate-100">
                    <img
                      src={imageForCategory(activity.category)}
                      alt={activity.category}
                      className="h-28 w-full object-cover"
                    />
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-slate-500">{formatTime(activity.time)}</span>
                        {activity.estimated_cost > 0 && (
                          <span className="flex-shrink-0 text-xs text-slate-400">
                            ~{formatCurrency(activity.estimated_cost)}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-slate-900">{activity.name}</p>
                      <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                        {activity.category}
                      </span>
                      {activity.tip && (
                        <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
                          💡 {activity.tip}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Link
          to={tripId ? `/trips/${tripId}` : '/dashboard'}
          className="mt-10 inline-block rounded-[50px] bg-slate-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-700"
        >
          Back to trip
        </Link>
      </div>
    </div>
  )
}
