import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import type { Trip } from '../lib/types'

function formatDateRange(start: string | null, end: string | null) {
  if (!start || !end) return 'Dates not set'
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  return `${new Date(start).toLocaleDateString(undefined, opts)} – ${new Date(end).toLocaleDateString(undefined, opts)}`
}

export default function SharedTrip() {
  const { slug } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)
  const { format: formatCurrency } = useCurrency()

  useEffect(() => {
    if (!slug) return
    async function load() {
      const { data: link } = await supabase.from('shared_links').select('trip_id').eq('public_slug', slug).maybeSingle()
      if (!link) {
        setLoading(false)
        return
      }
      const { data: tripData } = await supabase.from('trips').select('*').eq('id', link.trip_id).single()
      setTrip(tripData)
      setLoading(false)
    }
    load()
  }, [slug])

  async function handleCopyTrip() {
    if (!trip) return
    if (!session) {
      navigate('/login')
      return
    }
    setCopying(true)
    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: session.user.id,
        name: `${trip.name} (copy)`,
        start_date: trip.start_date,
        end_date: trip.end_date,
        description: trip.description,
        budget: trip.budget,
        trip_vibe: trip.trip_vibe,
        cover_photo_url: trip.cover_photo_url,
        is_public: false,
        status: 'draft',
      })
      .select()
      .single()
    setCopying(false)
    if (!error && data) navigate(`/trips/${data.id}`)
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">Loading…</p>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 px-4 text-center">
        <p className="text-lg font-semibold text-slate-900">GlobeTrotter</p>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Itinerary not found</h1>
        <p className="mt-2 text-sm text-slate-500">This share link doesn't exist or is no longer active.</p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-slate-900 hover:underline">
          Go to GlobeTrotter
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-slate-50">
      {trip.cover_photo_url && (
        <div className="h-56 w-full">
          <img src={trip.cover_photo_url} alt={trip.name} className="h-full w-full object-cover" />
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <p className="text-sm font-semibold text-slate-500">GlobeTrotter · Shared itinerary</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">{trip.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{formatDateRange(trip.start_date, trip.end_date)}</p>

        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          {trip.trip_vibe && <span className="rounded-full bg-white px-3 py-1 shadow-sm">{trip.trip_vibe}</span>}
          {trip.budget && (
            <span className="rounded-full bg-white px-3 py-1 shadow-sm">Budget: {formatCurrency(trip.budget)}</span>
          )}
        </div>

        {trip.description && <p className="mt-4 text-sm text-slate-600">{trip.description}</p>}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">Itinerary</h2>
          <p className="mt-2 text-sm text-slate-500">
            The traveler hasn't added stops or activities to this itinerary yet.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyTrip}
          disabled={copying}
          className="mt-8 w-full appearance-none rounded-[50px] bg-slate-900 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {copying ? 'Copying…' : session ? 'Copy this trip' : 'Log in to copy this trip'}
        </button>
      </div>
    </div>
  )
}
