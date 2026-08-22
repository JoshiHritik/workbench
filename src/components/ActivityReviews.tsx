import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listReviews, upsertReview, deleteReview } from '../lib/reviews'
import type { ActivityReview } from '../lib/types'

function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          viewBox="0 0 24 24"
          className={`${size} ${n <= Math.round(value) ? 'text-amber-400' : 'text-slate-200'}`}
          fill="currentColor"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  )
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`}>
          <svg viewBox="0 0 24 24" className={`h-7 w-7 ${n <= value ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  )
}

export function ActivityReviews({ activityName, city }: { activityName: string; city: string }) {
  const { session } = useAuth()
  const [reviews, setReviews] = useState<ActivityReview[]>([])
  const [loading, setLoading] = useState(true)
  const [myRating, setMyRating] = useState(0)
  const [myComment, setMyComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listReviews(activityName, city).then((rows) => {
      if (cancelled) return
      setReviews(rows)
      setLoading(false)
      const mine = session ? rows.find((r) => r.user_id === session.user.id) : undefined
      if (mine) {
        setMyRating(mine.rating)
        setMyComment(mine.comment ?? '')
      } else {
        setMyRating(0)
        setMyComment('')
        setEditing(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [activityName, city, session])

  const myReview = session ? reviews.find((r) => r.user_id === session.user.id) : undefined
  const average = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0

  async function handleSubmit() {
    if (!session || myRating === 0) return
    setSaving(true)
    const { error } = await upsertReview(session.user.id, activityName, city, myRating, myComment)
    setSaving(false)
    if (!error) {
      setEditing(false)
      const rows = await listReviews(activityName, city)
      setReviews(rows)
    }
  }

  async function handleDelete() {
    if (!myReview) return
    setSaving(true)
    await deleteReview(myReview.id)
    setSaving(false)
    setMyRating(0)
    setMyComment('')
    setEditing(false)
    const rows = await listReviews(activityName, city)
    setReviews(rows)
  }

  const othersReviews = reviews.filter((r) => r.id !== myReview?.id)

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Ratings & reviews</h2>
        {reviews.length > 0 && (
          <span className="flex items-center gap-1.5 text-sm text-slate-600">
            <Stars value={average} /> {average.toFixed(1)} ({reviews.length})
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-slate-400">
        From GlobeTrotter travelers who've used this app — not pulled from Google or TripAdvisor.
      </p>

      {loading ? (
        <div className="mt-3 h-16 animate-pulse rounded-xl bg-slate-100" />
      ) : (
        <>
          {session && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
              {myReview && !editing ? (
                <div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500">Your review</p>
                      <Stars value={myReview.rating} />
                    </div>
                    <div className="flex gap-3 text-xs font-medium">
                      <button type="button" onClick={() => setEditing(true)} className="text-slate-600 hover:text-slate-900">
                        Edit
                      </button>
                      <button type="button" onClick={handleDelete} disabled={saving} className="text-red-500 hover:text-red-700">
                        Delete
                      </button>
                    </div>
                  </div>
                  {myReview.comment && <p className="mt-2 text-sm text-slate-600">{myReview.comment}</p>}
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium text-slate-500">{myReview ? 'Edit your review' : 'Rate this experience'}</p>
                  <div className="mt-1.5">
                    <StarPicker value={myRating} onChange={setMyRating} />
                  </div>
                  <textarea
                    value={myComment}
                    onChange={(e) => setMyComment(e.target.value)}
                    rows={2}
                    placeholder="What was it like? (optional)"
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={myRating === 0 || saving}
                      className="rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? 'Saving…' : 'Submit'}
                    </button>
                    {myReview && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false)
                          setMyRating(myReview.rating)
                          setMyComment(myReview.comment ?? '')
                        }}
                        className="rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 space-y-3">
            {othersReviews.length === 0 && !myReview ? (
              <p className="text-sm text-slate-400">No reviews yet — be the first to rate this.</p>
            ) : (
              othersReviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-slate-100 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-slate-500">GlobeTrotter traveler</p>
                    <Stars value={r.rating} />
                  </div>
                  {r.comment && <p className="mt-1.5 text-sm text-slate-600">{r.comment}</p>}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}
