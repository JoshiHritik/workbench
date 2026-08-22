import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { AppHeader } from '../components/AppHeader'
import { LanguageSelect } from '../components/LanguageSelect'
import type { Profile } from '../lib/types'

const MAX_AVATAR_BYTES = 3 * 1024 * 1024

export default function Settings() {
  const { session } = useAuth()
  const [fullName, setFullName] = useState('')
  const [language, setLanguage] = useState('en')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!session) return
    async function load() {
      const { data } = await supabase.from('profiles').select('*').eq('id', session!.user.id).single()
      if (data) {
        const profile = data as Profile
        setFullName(profile.full_name ?? '')
        setLanguage(profile.language ?? 'en')
        setAvatarUrl(profile.avatar_url)
      }
      setLoading(false)
    }
    load()
  }, [session])

  useEffect(() => {
    if (!avatarFile) {
      setAvatarPreview(null)
      return
    }
    const url = URL.createObjectURL(avatarFile)
    setAvatarPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [avatarFile])

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Avatar must be an image.')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError('Avatar must be under 3MB.')
      return
    }
    setError(null)
    setAvatarFile(file)
  }

  async function handleSave() {
    if (!session) return
    setSaving(true)
    setSaved(false)
    setError(null)

    let newAvatarUrl = avatarUrl
    if (avatarFile) {
      const path = `${session.user.id}/avatar-${Date.now()}-${avatarFile.name}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, avatarFile)
      if (uploadError) {
        setSaving(false)
        setError(uploadError.message)
        return
      }
      newAvatarUrl = supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() || null, language, avatar_url: newAvatarUrl })
      .eq('id', session.user.id)

    if (profileError) {
      setSaving(false)
      setError(profileError.message)
      return
    }

    await supabase.auth.updateUser({ data: { full_name: fullName.trim() || null } })

    setAvatarUrl(newAvatarUrl)
    setAvatarFile(null)
    setSaving(false)
    setSaved(true)
  }

  if (loading) {
    return (
      <div className="min-h-svh bg-slate-50">
        <AppHeader />
        <p className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-slate-500">Loading…</p>
      </div>
    )
  }

  const displayAvatar = avatarPreview || avatarUrl

  return (
    <div className="min-h-svh bg-slate-50">
      <AppHeader />
      <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">Profile & Settings</h1>

        <div className="mt-6 space-y-5 rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full bg-slate-100"
            >
              {displayAvatar ? (
                <img src={displayAvatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-xl font-medium text-slate-400">
                  {(fullName || session?.user.email || '?').charAt(0).toUpperCase()}
                </span>
              )}
            </button>
            <div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-slate-900 hover:underline"
              >
                Change photo
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-[50px] border border-slate-300 px-5 py-3 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <p className="rounded-[50px] border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-500">
              {session?.user.email}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Language</label>
            <LanguageSelect value={language} onChange={setLanguage} />
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {saved && (
            <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              Saved.
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full appearance-none rounded-[50px] bg-slate-900 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 p-6">
          <p className="text-sm font-medium text-slate-700">Delete account</p>
          <p className="mt-1 text-xs text-slate-500">
            To permanently delete your account, contact support and we'll take care of it for you.
          </p>
        </div>
      </main>
    </div>
  )
}
