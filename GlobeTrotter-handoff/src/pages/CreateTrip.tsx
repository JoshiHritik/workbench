import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { AppHeader } from '../components/AppHeader'
import { DateRangePicker } from '../components/DateRangePicker'
import { TripVibeSelect } from '../components/TripVibeSelect'

const MAX_COVER_PHOTO_BYTES = 5 * 1024 * 1024

const inputClass =
  'w-full rounded-[50px] border border-slate-300 px-5 py-3.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500'

type SaveStatus = 'draft' | 'active'

// Fallback cover photo when the user doesn't upload one, picked by trip vibe.
const VIBE_FALLBACK_IMAGES: Record<string, string> = {
  Adventure: 'https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=70',
  Relaxing: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=70',
  Cultural: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=800&q=70',
  Beach: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=800&q=70',
  Romantic: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=70',
  Family: 'https://images.unsplash.com/photo-1476234251651-f353703a034d?auto=format&fit=crop&w=800&q=70',
}
const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=70'

export default function CreateTrip() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [searchParams] = useSearchParams()
  const [name, setName] = useState(() => {
    const destination = searchParams.get('destination')
    return destination ? `${destination} Trip` : ''
  })
  const [startDate, setStartDate] = useState(() => searchParams.get('start') ?? '')
  const [endDate, setEndDate] = useState(() => searchParams.get('end') ?? '')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [tripVibe, setTripVibe] = useState('')
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null)
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null)
  const [isPublic, setIsPublic] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<SaveStatus | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!coverPhoto) {
      setCoverPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(coverPhoto)
    setCoverPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [coverPhoto])

  const isDirty = Boolean(
    name || startDate || endDate || description || budget || tripVibe || coverPhoto || isPublic,
  )

  function validate(): string | null {
    if (!name.trim()) return 'Trip name is required.'
    if (!startDate) return 'Start date is required.'
    if (!endDate) return 'End date is required.'
    if (endDate < startDate) return 'End date must be on or after the start date.'
    return null
  }

  function handleCoverPhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Cover photo must be an image.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_COVER_PHOTO_BYTES) {
      setError('Cover photo must be under 5MB.')
      e.target.value = ''
      return
    }
    setError(null)
    setCoverPhoto(file)
  }

  function handleRemoveCoverPhoto() {
    setCoverPhoto(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleClose() {
    if (isDirty && !window.confirm('Discard this trip? Your changes will not be saved.')) return
    navigate('/dashboard')
  }

  async function handleSave(status: SaveStatus) {
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(status)

    let coverPhotoUrl: string | null = null
    if (coverPhoto) {
      const path = `${session!.user.id}/${crypto.randomUUID()}-${coverPhoto.name}`
      const { error: uploadError } = await supabase.storage.from('trip-covers').upload(path, coverPhoto)
      if (uploadError) {
        setSaving(null)
        setError(uploadError.message)
        return
      }
      coverPhotoUrl = supabase.storage.from('trip-covers').getPublicUrl(path).data.publicUrl
    } else {
      coverPhotoUrl = VIBE_FALLBACK_IMAGES[tripVibe] ?? DEFAULT_FALLBACK_IMAGE
    }

    const { data, error: insertError } = await supabase
      .from('trips')
      .insert({
        user_id: session!.user.id,
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        description: description.trim() || null,
        budget: budget ? Number(budget) : null,
        trip_vibe: tripVibe || null,
        cover_photo_url: coverPhotoUrl,
        is_public: isPublic,
        status,
      })
      .select()
      .single()

    setSaving(null)

    if (insertError) {
      setError(insertError.message)
      return
    }

    navigate(status === 'draft' ? '/dashboard' : `/trips/${data.id}`)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    await handleSave('active')
  }

  return (
    <div className="min-h-svh bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Create a trip</h1>
            <p className="mt-1 text-sm text-slate-500">Give it a name, some dates, and you're off.</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-slate-300 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
              Trip name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              placeholder="Summer in Southeast Asia"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Travel dates</label>
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onChange={(start, end) => {
                setStartDate(start)
                setEndDate(end)
              }}
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-2xl border border-slate-300 px-5 py-3 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              placeholder="What's this trip about?"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="budget" className="mb-1 block text-sm font-medium text-slate-700">
                Budget <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="budget"
                type="number"
                min={0}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className={inputClass}
                placeholder="e.g. 10,000"
              />
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium text-slate-700">Trip vibe</label>
              <TripVibeSelect value={tripVibe} onChange={setTripVibe} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Cover photo <span className="font-normal text-slate-400">(optional)</span>
            </label>
            {coverPreviewUrl ? (
              <div className="relative mt-1 h-40 w-full overflow-hidden rounded-2xl border border-slate-200">
                <img src={coverPreviewUrl} alt="Cover preview" className="h-full w-full object-cover" />
                <div className="absolute right-2 top-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-700 shadow hover:bg-white"
                  >
                    Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveCoverPhoto}
                    className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-medium text-red-600 shadow hover:bg-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 flex h-32 w-full items-center justify-center rounded-2xl border border-dashed border-slate-300 text-sm text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
              >
                + Add a cover photo
              </button>
            )}
            <input
              ref={fileInputRef}
              id="coverPhoto"
              type="file"
              accept="image/*"
              onChange={handleCoverPhotoChange}
              className="hidden"
            />
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-5 py-3.5">
            <div>
              <p className="text-sm font-medium text-slate-700">Make trip public</p>
              <p className="text-xs text-slate-400">Private by default. You can share it later.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic((v) => !v)}
              className={`relative h-7 w-12 flex-shrink-0 appearance-none rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 ${
                isPublic ? 'bg-slate-900' : 'bg-slate-200'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  isPublic ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleSave('draft')}
              disabled={saving !== null}
              className="flex-1 rounded-[50px] border border-slate-300 px-5 py-3.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving === 'draft' ? 'Saving…' : 'Save as draft'}
            </button>
            <button
              type="submit"
              disabled={saving !== null}
              className="flex-1 appearance-none rounded-[50px] bg-slate-900 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving === 'active' ? 'Saving…' : 'Save & Continue'}
            </button>
          </div>
        </form>
      </main>
    </div>
  )
}
