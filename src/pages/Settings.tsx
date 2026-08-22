import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useCurrency } from '../context/CurrencyContext'
import { AppHeader } from '../components/AppHeader'
import { LanguageSelect } from '../components/LanguageSelect'
import { CurrencyFullSelect } from '../components/CurrencyFullSelect'
import { AvatarCropModal } from '../components/AvatarCropModal'
import { DeleteDataModal } from '../components/DeleteDataModal'
import { loadNotificationPrefs, saveNotificationPrefs, type NotificationPrefs } from '../lib/notificationPrefs'
import { DATE_FORMAT_OPTIONS, loadDateFormatPref, saveDateFormatPref, type DateFormatPref } from '../lib/dateFormat'
import { listSavedCities, removeSavedCity } from '../lib/savedCities'
import { listFavoriteActivities, unfavoriteActivity } from '../lib/favoriteActivities'
import type { Profile, SavedCity } from '../lib/types'
import type { FavoriteActivityRow } from '../lib/favoriteActivities'

const MAX_AVATAR_BYTES = 3 * 1024 * 1024

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <p className="text-sm text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 flex-shrink-0 appearance-none rounded-full transition-colors ${checked ? 'bg-slate-900' : 'bg-slate-200'}`}
      >
        <span
          className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  )
}

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="mt-8 border-t border-slate-200 pt-8">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      <div className="mt-4">{children}</div>
    </div>
  )
}

const inputClass =
  'w-full rounded-[50px] border border-slate-300 px-5 py-3 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500'

export default function Settings() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { currency, setCurrency } = useCurrency()

  // Personal info
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [language, setLanguage] = useState('en')
  const [defaultPublic, setDefaultPublic] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [cropFile, setCropFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSaved, setPasswordSaved] = useState(false)

  // Notifications
  const [notifPrefs, setNotifPrefs] = useState<NotificationPrefs>(() => loadNotificationPrefs())
  const [notifSaved, setNotifSaved] = useState(false)

  // Date format
  const [dateFormat, setDateFormat] = useState<DateFormatPref>(() => loadDateFormatPref())

  // Saved destinations / favorite activities
  const [savedCities, setSavedCities] = useState<SavedCity[]>([])
  const [favoriteActivities, setFavoriteActivities] = useState<FavoriteActivityRow[]>([])
  const [bookmarksLoading, setBookmarksLoading] = useState(true)

  // Export / delete
  const [exporting, setExporting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!session) return
    async function load() {
      const { data } = await supabase.from('profiles').select('*').eq('id', session!.user.id).single()
      if (data) {
        const profile = data as Profile
        setFullName(profile.full_name ?? '')
        setBio(profile.bio ?? '')
        setLanguage(profile.language ?? 'en')
        setDefaultPublic(profile.default_public ?? false)
        setAvatarUrl(profile.avatar_url)
      }
      setLoading(false)

      const [cities, activities] = await Promise.all([
        listSavedCities(session!.user.id),
        listFavoriteActivities(session!.user.id),
      ])
      setSavedCities(cities)
      setFavoriteActivities(activities)
      setBookmarksLoading(false)
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
    e.target.value = ''
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
    setCropFile(file)
  }

  function handleCropConfirm(blob: Blob) {
    setAvatarFile(new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
    setCropFile(null)
  }

  function handleRemoveAvatar() {
    setAvatarFile(null)
    setAvatarUrl(null)
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
      .update({
        full_name: fullName.trim() || null,
        bio: bio.trim() || null,
        language,
        default_public: defaultPublic,
        avatar_url: newAvatarUrl,
      })
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
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSaved(false)

    if (!session?.user.email) return
    if (!currentPassword) return setPasswordError('Enter your current password.')
    if (newPassword.length < 6) return setPasswordError('New password must be at least 6 characters.')
    if (newPassword !== confirmPassword) return setPasswordError('New passwords do not match.')

    setPasswordSaving(true)

    // Confirm the current password by attempting to sign in with it, rather
    // than trusting the already-active session — this is the "confirm
    // current password" step the change-password flow needs.
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    })
    if (verifyError) {
      setPasswordSaving(false)
      setPasswordError('Current password is incorrect.')
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    setPasswordSaving(false)

    if (updateError) {
      setPasswordError(updateError.message)
      return
    }

    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 3000)
  }

  function handleNotifChange(key: keyof NotificationPrefs, value: boolean) {
    const next = { ...notifPrefs, [key]: value }
    setNotifPrefs(next)
    saveNotificationPrefs(next)
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 2000)
  }

  function handleDateFormatChange(value: DateFormatPref) {
    setDateFormat(value)
    saveDateFormatPref(value)
  }

  async function handleRemoveSavedCity(id: string) {
    setSavedCities((prev) => prev.filter((c) => c.id !== id))
    await removeSavedCity(id)
  }

  async function handleUnfavoriteActivity(id: string) {
    setFavoriteActivities((prev) => prev.filter((a) => a.id !== id))
    await unfavoriteActivity(id)
  }

  async function handleExportData() {
    if (!session) return
    setExporting(true)
    const [{ data: profile }, { data: trips }, { data: stops }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', session.user.id).single(),
      supabase.from('trips').select('*').eq('user_id', session.user.id),
      supabase
        .from('trip_stops')
        .select('*, trips!inner(user_id)')
        .eq('trips.user_id', session.user.id),
    ])
    const payload = {
      exported_at: new Date().toISOString(),
      profile,
      trips,
      trip_stops: stops,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'globetrotter-data-export.json'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  async function handleDeleteData() {
    if (!session?.user.email) return
    setDeleteError(null)

    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      setDeleteError('Type DELETE to confirm.')
      return
    }
    if (!deletePassword) {
      setDeleteError('Enter your password to confirm.')
      return
    }

    setDeleting(true)
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password: deletePassword,
    })
    if (verifyError) {
      setDeleting(false)
      setDeleteError('Password is incorrect.')
      return
    }

    await Promise.all([
      supabase.from('trips').delete().eq('user_id', session.user.id),
      supabase.from('saved_cities').delete().eq('user_id', session.user.id),
      supabase.from('favorite_activities').delete().eq('user_id', session.user.id),
    ])
    await supabase
      .from('profiles')
      .update({ full_name: null, bio: null, avatar_url: null })
      .eq('id', session.user.id)

    await supabase.auth.signOut()
    navigate('/login')
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
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-semibold text-slate-900">Profile & Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your identity, preferences, and privacy.</p>

        <Card title="Personal information">
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
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-medium text-slate-900 hover:underline">
                Change photo
              </button>
              {displayAvatar && (
                <button type="button" onClick={handleRemoveAvatar} className="text-sm font-medium text-red-600 hover:underline">
                  Remove photo
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>
          </div>

          <div className="mt-5">
            <label htmlFor="fullName" className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input id="fullName" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </div>

          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <p className="rounded-[50px] border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-500">{session?.user.email}</p>
          </div>

          <div className="mt-4">
            <label htmlFor="bio" className="mb-1 block text-sm font-medium text-slate-700">
              Travel bio <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="A sentence or two about how you like to travel"
              className="w-full rounded-2xl border border-slate-300 px-5 py-3 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
            />
          </div>

          {error && <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          {saved && <p role="status" className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Saved.</p>}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-5 w-full appearance-none rounded-[50px] bg-slate-900 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </Card>

        <Card title="Password" description="Requires your current password.">
          <form onSubmit={handleChangePassword} className="space-y-3">
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className={inputClass}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              className={inputClass}
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              autoComplete="new-password"
              className={inputClass}
            />
            {passwordError && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{passwordError}</p>}
            {passwordSaved && <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Password updated.</p>}
            <button
              type="submit"
              disabled={passwordSaving}
              className="w-full appearance-none rounded-[50px] border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {passwordSaving ? 'Updating…' : 'Change password'}
            </button>
          </form>
        </Card>

        <Card title="Preferences">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Language</label>
            <LanguageSelect value={language} onChange={setLanguage} />
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
            <CurrencyFullSelect value={currency} onChange={setCurrency} />
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm font-medium text-slate-700">Date format</label>
            <div className="space-y-1.5">
              {DATE_FORMAT_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="dateFormat"
                    checked={dateFormat === opt.value}
                    onChange={() => handleDateFormatChange(opt.value)}
                    className="accent-slate-900"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Notifications">
          <Toggle
            label="Trip reminders"
            hint="Trips starting within 7 days"
            checked={notifPrefs.tripReminders}
            onChange={(v) => handleNotifChange('tripReminders', v)}
          />
          <Toggle
            label="Budget alerts"
            hint="When a trip's AI itinerary goes over budget"
            checked={notifPrefs.budgetAlerts}
            onChange={(v) => handleNotifChange('budgetAlerts', v)}
          />
          <Toggle
            label="Draft nudges"
            hint="Trips you started but haven't finished planning"
            checked={notifPrefs.draftNudges}
            onChange={(v) => handleNotifChange('draftNudges', v)}
          />
          {notifSaved && <p role="status" className="mt-2 text-xs text-emerald-600">Saved.</p>}
        </Card>

        <Card title="Privacy">
          <Toggle
            label="Make new trips public by default"
            hint="You can still change it per trip when creating one"
            checked={defaultPublic}
            onChange={setDefaultPublic}
          />
          <p className="mt-3 text-xs text-slate-400">
            This app doesn't use location tracking anywhere, so there's no location preference to set here.
          </p>
        </Card>

        <Card title="Saved destinations">
          {bookmarksLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : savedCities.length === 0 ? (
            <p className="text-sm text-slate-500">
              No saved cities yet. Save one from its city page to see it here.
            </p>
          ) : (
            <div className="space-y-2">
              {savedCities.map((city) => (
                <div key={city.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                      {city.image_url && <img src={city.image_url} alt={city.city_name} className="h-full w-full object-cover" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{city.city_name}</p>
                      <p className="text-xs text-slate-400">
                        {city.city_state ? `${city.city_state}, ` : ''}
                        {city.city_country}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSavedCity(city.id)}
                    className="flex-shrink-0 text-xs font-medium text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Favourite activities">
          {bookmarksLoading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : favoriteActivities.length === 0 ? (
            <p className="text-sm text-slate-500">
              No favourite activities yet. Heart one from Activity Search to see it here.
            </p>
          ) : (
            <div className="space-y-2">
              {favoriteActivities.map((fav) => (
                <div key={fav.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{fav.activities?.name ?? 'Activity'}</p>
                    {fav.activities?.cities && (
                      <p className="text-xs text-slate-400">
                        {fav.activities.cities.name}, {fav.activities.cities.country}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUnfavoriteActivity(fav.id)}
                    className="flex-shrink-0 text-xs font-medium text-slate-400 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Your data">
          <p className="text-sm text-slate-500">Download a copy of your profile and trip data as JSON.</p>
          <button
            type="button"
            onClick={handleExportData}
            disabled={exporting}
            className="mt-3 w-full appearance-none rounded-[50px] border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? 'Preparing…' : 'Export my data'}
          </button>
        </Card>

        <div className="mt-8 border-t border-slate-200 pt-8">
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut()
              navigate('/login')
            }}
            className="w-full appearance-none rounded-[50px] border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Log out
          </button>
        </div>

        <div className="mt-8 border-t border-red-200 pt-8">
          <p className="text-sm font-medium text-red-700">Delete account data</p>
          <p className="mt-1 text-xs text-slate-500">
            This permanently deletes all your trips and profile data and signs you out. Your login itself isn't
            removed from Supabase Auth by this — that step requires contacting support, since it can't be done
            safely from the browser.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-3 rounded-[50px] border border-red-300 px-5 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50"
          >
            Delete my data
          </button>
        </div>
      </main>

      {cropFile && <AvatarCropModal file={cropFile} onCancel={() => setCropFile(null)} onConfirm={handleCropConfirm} />}

      {showDeleteConfirm && (
        <DeleteDataModal
          password={deletePassword}
          onPasswordChange={setDeletePassword}
          confirmText={deleteConfirmText}
          onConfirmTextChange={setDeleteConfirmText}
          error={deleteError}
          deleting={deleting}
          onCancel={() => {
            setShowDeleteConfirm(false)
            setDeletePassword('')
            setDeleteConfirmText('')
            setDeleteError(null)
          }}
          onConfirm={handleDeleteData}
        />
      )}
    </div>
  )
}
