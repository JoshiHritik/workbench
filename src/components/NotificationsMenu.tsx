import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import type { Trip } from '../lib/types'

interface Notification {
  id: string
  message: string
  tripId: string
}

export function NotificationsMenu() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!session) return

    async function load() {
      const { data } = await supabase.from('trips').select('*').eq('user_id', session!.user.id)
      if (!data) return

      const today = new Date().toISOString().slice(0, 10)
      const soon = new Date()
      soon.setDate(soon.getDate() + 7)
      const soonIso = soon.toISOString().slice(0, 10)

      const items: Notification[] = []
      data.forEach((trip: Trip) => {
        if (trip.status === 'draft') {
          items.push({
            id: `draft-${trip.id}`,
            message: `"${trip.name}" is still a draft. Finish planning it.`,
            tripId: trip.id,
          })
        }
        if (trip.status === 'active' && trip.start_date && trip.start_date >= today && trip.start_date <= soonIso) {
          items.push({
            id: `upcoming-${trip.id}`,
            message: `"${trip.name}" starts soon.`,
            tripId: trip.id,
          })
        }
      })
      setNotifications(items)
    }

    load()
  }, [session])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white/80 text-slate-600 backdrop-blur-sm transition hover:bg-white"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0m6 0H9"
          />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
            {notifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
          <p className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-900">Notifications</p>
          {notifications.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">You&apos;re all caught up.</p>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    navigate(`/trips/${n.tripId}`)
                  }}
                  className="block w-full border-b border-slate-50 px-4 py-3 text-left text-sm text-slate-700 last:border-0 hover:bg-slate-50"
                >
                  {n.message}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
