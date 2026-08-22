import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { AppHeader } from '../components/AppHeader'

interface ActivityRow {
  id: string
  name: string
  category: string | null
  cost: number | null
  duration_minutes: number | null
  description: string | null
  cities: { name: string; country: string } | null
}

const CATEGORIES = ['Sightseeing', 'Culture', 'Food', 'Adventure', 'Relaxation', 'Beach', 'Nightlife']

export default function ActivitySearch() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [maxCost, setMaxCost] = useState('')
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(async () => {
      setLoading(true)
      let query = supabase.from('activities').select('id, name, category, cost, duration_minutes, description, cities(name, country)')

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
            {activities.map((activity) => (
              <div key={activity.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-900">{activity.name}</p>
                  {activity.category && (
                    <span className="flex-shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
                      {activity.category}
                    </span>
                  )}
                </div>
                {activity.cities && (
                  <p className="mt-1 text-xs text-slate-400">
                    {activity.cities.name}, {activity.cities.country}
                  </p>
                )}
                {activity.description && <p className="mt-2 text-sm text-slate-600">{activity.description}</p>}
                <div className="mt-3 flex gap-4 text-xs text-slate-500">
                  {activity.cost !== null && <span>{activity.cost === 0 ? 'Free' : `~${activity.cost}`}</span>}
                  {activity.duration_minutes && <span>{Math.round(activity.duration_minutes / 60)}h</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
