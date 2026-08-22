import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { AuthLayout } from '../components/AuthLayout'
import { GoogleButton } from '../components/GoogleButton'
import { PasswordInput } from '../components/PasswordInput'

export default function Signup() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const showMismatch =
    confirmPassword.length > 0 && confirmPassword.length >= password.length && password !== confirmPassword

  function validate(): string | null {
    if (!name.trim()) return 'Name is required.'
    if (!email.trim()) return 'Email is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address.'
    if (!password) return 'Password is required.'
    if (password.length < 6) return 'Password must be at least 6 characters.'
    if (password !== confirmPassword) return 'Passwords do not match.'
    return null
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: name.trim() } },
    })
    setLoading(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (!data.session) {
      setNotice('Account created! Check your email to confirm before logging in.')
      return
    }

    navigate('/dashboard')
  }

  return (
    <AuthLayout>
      <div>
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">GlobeTrotter</h1>
          <p className="mt-1 text-sm text-slate-500">Create an account to start planning</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-[50px] border border-slate-300 px-5 py-3.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-[50px] border border-slate-300 px-5 py-3.5 text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
              Confirm Password
            </label>
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="••••••••"
            />
            {showMismatch && <p className="mt-1 text-xs text-red-600">Passwords do not match.</p>}
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full appearance-none rounded-[50px] bg-slate-900 px-5 py-3.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <div className="my-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-xs text-slate-400">OR</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <GoogleButton />

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-slate-900 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
