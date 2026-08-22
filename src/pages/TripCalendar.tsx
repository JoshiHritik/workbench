import { Link, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'

export default function TripCalendar() {
  const { tripId } = useParams()

  return (
    <div className="min-h-svh bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
        <h1 className="text-xl font-semibold text-slate-900">Trip Calendar</h1>
        <p className="mt-2 text-sm text-slate-500">Coming next. This screen isn't built yet.</p>
        <Link
          to={tripId ? `/trips/${tripId}` : '/dashboard'}
          className="mt-6 inline-block text-sm font-medium text-slate-900 hover:underline"
        >
          Back
        </Link>
      </main>
    </div>
  )
}
