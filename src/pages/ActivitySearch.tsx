import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AppHeader } from '../components/AppHeader'
import { useAuth } from '../context/AuthContext'
import { listFavoriteActivities, favoriteActivity, unfavoriteActivity } from '../lib/favoriteActivities'

interface ActivityRow {
  id: string
  name: string
  category: string | null
  cost: number | null
  duration_minutes: number | null
  description: string | null
  city_id: string
  cities: { name: string; country: string } | null
}

interface TripStopOption {
  stopId: string
  tripId: string
  tripName: string
  cityId: string
  arrivalDate: string | null
  departureDate: string | null
}

interface AddedEntry {
  tripActivityId: string
  tripName: string
}

const CATEGORIES = ['Sightseeing', 'Culture', 'Food', 'Adventure', 'Relaxation', 'Beach', 'Nightlife']

function HeartButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={active ? 'Remove from favourites' : 'Add to favourites'}
      className="absolute right-3 top-3 text-slate-300 transition hover:text-red-500"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" style={active ? { color: '#ef4444' } : undefined}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-7-6.1-7-11.5A7 7 0 0112 3a7 7 0 017 6.5C19 14.9 12 21 12 21z" />
      </svg>
    </button>
  )
}

export default function ActivitySearch() {
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [maxCost, setMaxCost] = useState('')
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)
  const [favorites, setFavorites] = useState<Record<string, string>>({})
  const [tripStops, setTripStops] = useState<TripStopOption[]>([])
  const [addedByActivity, setAddedByActivity] = useState<Record<string, AddedEntry>>({})
  const [quickView, setQuickView] = useState<ActivityRow | null>(null)
  const [addModalActivity, setAddModalActivity] = useState<ActivityRow | null>(null)

  useEffect(() => {
    if (!session) return
    listFavoriteActivities(session.user.id).then((rows) => {
      const map: Record<string, string> = {}
      rows.forEach((r) => {
        map[r.activity_id] = r.id
      })
      setFavorites(map)
    })

    supabase
      .from('trip_stops')
      .select('id, trip_id, city_id, arrival_date, departure_date, trips!inner(user_id, name)')
      .eq('trips.user_id', session.user.id)
      .then(({ data }) => {
        const rows = (data ?? []) as unknown as {
          id: string
          trip_id: string
          city_id: string
          arrival_date: string | null
          departure_date: string | null
          trips: { name: string }
        }[]
        setTripStops(
          rows.map((r) => ({
            stopId: r.id,
            tripId: r.trip_id,
            tripName: r.trips.name,
            cityId: r.city_id,
            arrivalDate: r.arrival_date,
            departureDate: r.departure_date,
          })),
        )
      })

    supabase
      .from('trip_activities')
      .select('id, activity_id, trip_stops!inner(trip_id, trips!inner(user_id, name))')
      .eq('trip_stops.trips.user_id', session.user.id)
      .then(({ data }) => {
        const rows = (data ?? []) as unknown as { id: string; activity_id: string; trip_stops: { trips: { name: string } } }[]
        const map: Record<string, AddedEntry> = {}
        rows.forEach((r) => {
          map[r.activity_id] = { tripActivityId: r.id, tripName: r.trip_stops.trips.name }
        })
        setAddedByActivity(map)
      })
  }, [session])

  async function handleToggleFavorite(activityId: string) {
    if (!session) return
    const existingFavoriteId = favorites[activityId]
    if (existingFavoriteId) {
      setFavorites((prev) => {
        const next = { ...prev }
        delete next[activityId]
        return next
      })
      await unfavoriteActivity(existingFavoriteId)
    } else {
      const { error } = await favoriteActivity(session.user.id, activityId)
      if (!error) {
        const rows = await listFavoriteActivities(session.user.id)
        const match = rows.find((r) => r.activity_id === activityId)
        if (match) setFavorites((prev) => ({ ...prev, [activityId]: match.id }))
      }
    }
  }

  async function handleAddToTrip(activity: ActivityRow, stop: TripStopOption) {
    const { data, error } = await supabase
      .from('trip_activities')
      .insert({ trip_stop_id: stop.stopId, activity_id: activity.id, scheduled_date: stop.arrivalDate })
      .select()
      .single()
    if (!error && data) {
      setAddedByActivity((prev) => ({ ...prev, [activity.id]: { tripActivityId: data.id, tripName: stop.tripName } }))
      setAddModalActivity(null)
    }
  }

  async function handleRemoveFromTrip(activityId: string) {
    const entry = addedByActivity[activityId]
    if (!entry) return
    setAddedByActivity((prev) => {
      const next = { ...prev }
      delete next[activityId]
      return next
    })
    await supabase.from('trip_activities').delete().eq('id', entry.tripActivityId)
  }

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(async () => {
      setLoading(true)
      let query = supabase.from('activities').select('id, name, category, cost, duration_minutes, description, city_id, cities(name, country)')

      if (search.trim()) query = query.ilike('name', `%${search.trim()}%`)
      if (category) query = query.eq('category', category)
      if (maxCost) query = query.lte('cost', Number(maxCost))

      const { data } = await query.order('name').limit(60)
      if (!cancelled) {
        setActivities((data as unknown as ActivityRow[]) ?? [])
        setLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [search, category, maxCost])

  function matchingStops(activity: ActivityRow) {
    return tripStops.filter((s) => s.cityId === activity.city_id)
  }

  return (
    <div className="min-h-svh bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">Find Activities</h1>
        <p className="mt-1 text-sm text-slate-500">Browse things to do across every destination.</p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search activities…"
            className="rounded-[50px] border border-slate-300 px-5 py-3 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 sm:flex-1"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-[50px] border border-slate-300 px-5 py-3 text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Any category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={maxCost}
            onChange={(e) => setMaxCost(e.target.value)}
            placeholder="Max cost"
            className="w-32 rounded-[50px] border border-slate-300 px-5 py-3 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
          />
        </div>

        {loading ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : activities.length === 0 ? (
          <p className="mt-8 text-sm text-slate-500">No activities match those filters.</p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => {
              const added = addedByActivity[activity.id]
              return (
                <div key={activity.id} className="relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  {session && <HeartButton active={Boolean(favorites[activity.id])} onClick={() => handleToggleFavorite(activity.id)} />}
                  <button type="button" onClick={() => setQuickView(activity)} className="block w-full pr-8 text-left">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-900">{activity.name}</p>
                      {activity.category && (
                        <span className="flex-shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{activity.category}</span>
                      )}
                    </div>
                    {activity.cities && (
                      <p className="mt-1 text-xs text-slate-400">
                        {activity.cities.name}, {activity.cities.country}
                      </p>
                    )}
                    {activity.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{activity.description}</p>}
                    <div className="mt-3 flex gap-4 text-xs text-slate-500">
                      {activity.cost !== null && <span>{activity.cost === 0 ? 'Free' : `~${activity.cost}`}</span>}
                      {activity.duration_minutes && <span>{Math.round(activity.duration_minutes / 60)}h</span>}
                    </div>
                  </button>

                  {session && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {added ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-emerald-600">✓ Added to {added.tripName}</span>
                          <button type="button" onClick={() => handleRemoveFromTrip(activity.id)} className="text-xs font-medium text-slate-400 hover:text-red-600">
                            Remove
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddModalActivity(activity)}
                          className="w-full rounded-full border border-slate-300 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          + Add to trip
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

      {quickView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setQuickView(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{quickView.name}</h2>
              {quickView.category && <span className="flex-shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{quickView.category}</span>}
            </div>
            {quickView.cities && (
              <p className="mt-1 text-sm text-slate-400">
                {quickView.cities.name}, {quickView.cities.country}
              </p>
            )}
            {quickView.description && <p className="mt-3 text-sm text-slate-600">{quickView.description}</p>}
            <div className="mt-3 flex gap-4 text-sm text-slate-500">
              {quickView.cost !== null && <span>{quickView.cost === 0 ? 'Free' : `~${quickView.cost}`}</span>}
              {quickView.duration_minutes && <span>{Math.round(quickView.duration_minutes / 60)}h</span>}
            </div>
            <button
              type="button"
              onClick={() => setQuickView(null)}
              className="mt-5 w-full rounded-[50px] border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {addModalActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setAddModalActivity(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-semibold text-slate-900">Add "{addModalActivity.name}" to a trip</h2>
            {matchingStops(addModalActivity).length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                None of your trips have a stop in {addModalActivity.cities?.name ?? 'this city'} yet. Add it as a stop on a trip first,
                from that trip's page.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {matchingStops(addModalActivity).map((stop) => (
                  <button
                    key={stop.stopId}
                    type="button"
                    onClick={() => handleAddToTrip(addModalActivity, stop)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-left text-sm text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                  >
                    {stop.tripName}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setAddModalActivity(null)}
              className="mt-4 w-full rounded-[50px] border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
