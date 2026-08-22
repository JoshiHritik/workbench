import { Link, useParams } from 'react-router-dom'

export default function SharedTrip() {
  const { slug } = useParams()

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <p className="text-lg font-semibold text-slate-900">GlobeTrotter</p>
      <h1 className="mt-4 text-xl font-semibold text-slate-900">Shared Itinerary</h1>
      <p className="mt-2 text-sm text-slate-500">
        Coming next. This public trip view isn&apos;t built yet.
        {slug && <span className="mt-1 block text-xs text-slate-400">Link: {slug}</span>}
      </p>
      <Link to="/login" className="mt-6 inline-block text-sm font-medium text-slate-900 hover:underline">
        Go to GlobeTrotter
      </Link>
    </div>
  )
}
