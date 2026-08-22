import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { MiniMap } from '../components/MiniMap'
import { fetchWikiInfo, fetchNearbyPlaces, fetchWikiSummaryByTitle, looksLikeAttraction, type WikiInfo } from '../lib/wiki'
import { geocode, type GeocodeResult } from '../lib/geocode'

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=70'

const MAX_NEARBY = 9

function NearbyCard({ info }: { info: WikiInfo }) {
  return (
    <a
      href={info.url ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(info.title.replace(/ /g, '_'))}`}
      target="_blank"
      rel="noreferrer"
      className="block overflow-hidden rounded-xl border border-slate-200 bg-white transition hover:shadow-sm"
    >
      <div className="h-36 w-full bg-slate-100">
        <img src={info.image ?? ''} alt={info.title} className="h-full w-full object-cover" />
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-slate-900">{info.title}</p>
        {info.extract && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{info.extract}</p>}
      </div>
    </a>
  )
}

export default function CitySearch() {
  const [params] = useSearchParams()
  const name = params.get('name') ?? ''
  const start = params.get('start')
  const end = params.get('end')

  const [geo, setGeo] = useState<GeocodeResult | null | undefined>(undefined)
  const [cityInfo, setCityInfo] = useState<WikiInfo | null | undefined>(undefined)
  const [nearby, setNearby] = useState<WikiInfo[] | null>(null)

  useEffect(() => {
    if (!name.trim()) return
    let cancelled = false
    setNearby(null)

    geocode(name).then(async (res) => {
      if (cancelled) return
      setGeo(res)
      if (!res) {
        setNearby([])
        return
      }

      const places = await fetchNearbyPlaces(res.lat, res.lon)
      const candidates = places
        .map((p) => p.title)
        .filter((t) => t.toLowerCase() !== name.trim().toLowerCase())

      const infos = await Promise.all(candidates.map((title) => fetchWikiSummaryByTitle(title)))
      if (cancelled) return

      const filtered = infos.filter((info): info is WikiInfo => Boolean(info) && looksLikeAttraction(info!))
      setNearby(filtered.slice(0, MAX_NEARBY))
    })

    fetchWikiInfo(name).then((res) => {
      if (!cancelled) setCityInfo(res)
    })

    return () => {
      cancelled = true
    }
  }, [name])

  function tripUrl() {
    const p = new URLSearchParams()
    if (name.trim()) p.set('destination', name.trim())
    if (start) p.set('start', start)
    if (end) p.set('end', end)
    const query = p.toString()
    return query ? `/create-trip?${query}` : '/create-trip'
  }

  if (!name.trim()) {
    return (
      <div className="min-h-svh bg-slate-50">
        <AppHeader />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
          <h1 className="text-xl font-semibold text-slate-900">Explore a city</h1>
          <p className="mt-2 text-sm text-slate-500">Search for a destination from the dashboard to explore it here.</p>
          <Link to="/dashboard" className="mt-6 inline-block text-sm font-medium text-slate-900 hover:underline">
            Back to dashboard
          </Link>
        </main>
      </div>
    )
  }

  const heroImage = cityInfo?.image ?? DEFAULT_HERO_IMAGE

  return (
    <div className="min-h-svh bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        <div className="overflow-hidden rounded-2xl">
          <div className="relative h-64 w-full sm:h-80">
            <img src={heroImage} alt={name} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold text-white sm:text-4xl">{name}</h1>
                {geo?.displayName && (
                  <p className="mt-1 max-w-xl truncate text-sm text-white/80">{geo.displayName}</p>
                )}
              </div>
              <Link
                to={tripUrl()}
                className="flex-shrink-0 rounded-[50px] bg-white px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
              >
                Plan the Trip
              </Link>
            </div>
          </div>
        </div>

        {cityInfo?.extract && (
          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-slate-600">{cityInfo.extract}</p>
        )}

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <h2 className="text-lg font-semibold text-slate-900">Things to do</h2>
            {nearby === null ? (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            ) : nearby.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                We couldn't find real listings for this place yet. Try a bigger nearby city, or plan the trip and add
                your own stops.
              </p>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {nearby.map((info) => (
                  <NearbyCard key={info.title} info={info} />
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Location</h2>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              {geo === undefined ? (
                <div className="h-96 animate-pulse bg-slate-100" />
              ) : (
                <MiniMap pins={geo ? [{ lat: geo.lat, lon: geo.lon, label: name }] : []} className="h-96 w-full" />
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            to={tripUrl()}
            className="rounded-[50px] bg-slate-900 px-8 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            Plan the Trip to {name}
          </Link>
        </div>
      </main>
    </div>
  )
}
