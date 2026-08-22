import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { AppHeader } from '../components/AppHeader'

const MAX_COVER_PHOTO_BYTES = 5 * 1024 * 1024

const inputClass =
  'w-full rounded-[50px] border border-slate-300 px-5 py-3.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500'

export default function CreateTrip() {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function validate(): string | null {
    if (!name.trim()) return 'Trip name is required.'
    if (!startDate) return 'Start date is required.'
    if (!endDate) return 'End date is required.'
    if (endDate < startDate) return 'End date must be on or after the start date.'
    return null
  }

  function handleCoverPhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) {
      setCoverPhoto(null)
      return
    }
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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    let coverPhotoUrl: string | null = null
    if (coverPhoto) {
      const path = `${session!.user.id}/${crypto.randomUUID()}-${coverPhoto.name}`
      const { error: uploadError } = await supabase.storage.from('trip-covers').upload(path, coverPhoto)
      if (uploadError) {
        setLoading(false)
        setError(uploadError.message)
        return
      }
      coverPhotoUrl = supabase.storage.from('trip-covers').getPublicUrl(path).data.publicUrl
    }

    const { data, error: insertError } = await supabase
      .from('trips')
      .insert({
        user_id: session!.user.id,
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
        description: description.trim() || null,
        cover_photo_url: coverPhotoUrl,
      })
      .select()
      .single()

    setLoading(false)

    if (insertError) {
      setError(insertError.message)
      return
    }

    navigate(`/trips/${data.id}`)
  }

  return (
    <div className="min-h-svh bg-slate-50">
      <AppHeader />

      <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">Create a trip</h1>
        <p className="mt-1 text-sm text-slate-500">Give it a name, some dates, and you're off.</p>

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

          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="startDate" className="mb-1 block text-sm font-medium text-slate-700">
                Start date
              </label>
              <input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex-1">
              <label htmlFor="endDate" className="mb-1 block text-sm font-medium text-slate-700">
                End date
              </label>
              <input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
              Description
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

          <div>
            <label htmlFor="coverPhoto" className="mb-1 block text-sm font-medium text-slate-700">
              Cover photo <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="coverPhoto"
              type="file"
              accept="image/*"
              onChange={handleCoverPhotoChange}
              className="block w-full text-sm text-slate-500 file:mr-4 file:rounded-[50px] file:border file:border-slate-300 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
            />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full appearance-none rounded-[50px] bg-slate-900 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating…' : 'Save trip'}
          </button>
        </form>
      </main>
    </div>
  )
}
