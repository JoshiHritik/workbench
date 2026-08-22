import { useEffect, useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { supabase } from '../lib/supabaseClient'
import type { Trip, ActivityReview } from '../lib/types'

interface AdminTripRow extends Trip {
  profiles: { full_name: string | null } | null
}

interface Stats {
  totalUsers: number
  totalTrips: number
  draftTrips: number
  activeTrips: number
  publicTrips: number
  totalReviews: number
  avgRating: number
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  )
}

export default function Admin() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentTrips, setRecentTrips] = useState<AdminTripRow[]>([])
  const [recentUsers, setRecentUsers] = useState<{ id: string; full_name: string | null; created_at: string }[]>([])
  const [recentReviews, setRecentReviews] = useState<ActivityReview[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)

    const [
      { count: totalUsers },
      { data: allTrips },
      { count: totalReviews },
      { data: reviewRows },
      { data: tripsData },
      { data: usersData },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('trips').select('status, is_public'),
      supabase.from('activity_reviews').select('*', { count: 'exact', head: true }),
      supabase.from('activity_reviews').select('rating'),
      supabase
        .from('trips')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('profiles').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(10),
    ])

    const trips = allTrips ?? []
    const ratings = (reviewRows ?? []).map((r) => r.rating)

    setStats({
      totalUsers: totalUsers ?? 0,
      totalTrips: trips.length,
      draftTrips: trips.filter((t) => t.status === 'draft').length,
      activeTrips: trips.filter((t) => t.status === 'active').length,
      publicTrips: trips.filter((t) => t.is_public).length,
      totalReviews: totalReviews ?? 0,
      avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
    })
    setRecentTrips((tripsData as unknown as AdminTripRow[]) ?? [])
    setRecentUsers(usersData ?? [])

    const { data: reviews } = await supabase
      .from('activity_reviews')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(15)
    setRecentReviews(reviews ?? [])

    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  async function handleDeleteReview(id: string) {
    setRecentReviews((prev) => prev.filter((r) => r.id !== id))
    await supabase.from('activity_reviews').delete().eq('id', id)
  }

  return (
    <div className="min-h-svh bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">Admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          Real counts from the database — nothing here is simulated or sampled.
        </p>

        {loading || !stats ? (
          <p className="mt-8 text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <Card label="Total users" value={stats.totalUsers} />
              <Card label="Total trips" value={stats.totalTrips} />
              <Card label="Public trips" value={stats.publicTrips} />
              <Card label="Draft trips" value={stats.draftTrips} />
              <Card label="Active trips" value={stats.activeTrips} />
              <Card label="Total reviews" value={stats.totalReviews} />
            </div>
            {stats.totalReviews > 0 && (
              <p className="mt-3 text-sm text-slate-500">
                Platform-wide average rating: <span className="font-semibold text-slate-900">{stats.avgRating.toFixed(2)} / 5</span>
              </p>
            )}

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-slate-900">Recent signups</h2>
                <div className="mt-3 space-y-2">
                  {recentUsers.length === 0 ? (
                    <p className="text-sm text-slate-400">No users yet.</p>
                  ) : (
                    recentUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{u.full_name || 'Unnamed traveler'}</span>
                        <span className="text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h2 className="text-sm font-semibold text-slate-900">Recent trips</h2>
                <div className="mt-3 space-y-2">
                  {recentTrips.length === 0 ? (
                    <p className="text-sm text-slate-400">No trips yet.</p>
                  ) : (
                    recentTrips.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <p className="truncate text-slate-700">{t.name}</p>
                          <p className="text-xs text-slate-400">{t.profiles?.full_name || 'Unnamed traveler'}</p>
                        </div>
                        <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                          {t.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-sm font-semibold text-slate-900">Recent reviews</h2>
              <div className="mt-3 space-y-2">
                {recentReviews.length === 0 ? (
                  <p className="text-sm text-slate-400">No reviews yet.</p>
                ) : (
                  recentReviews.map((r) => (
                    <div key={r.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 px-4 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800">
                          {r.activity_name} <span className="font-normal text-slate-400">· {r.city}</span>
                        </p>
                        <p className="text-xs text-amber-600">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</p>
                        {r.comment && <p className="mt-1 text-sm text-slate-600">{r.comment}</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteReview(r.id)}
                        className="flex-shrink-0 text-xs font-medium text-slate-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
