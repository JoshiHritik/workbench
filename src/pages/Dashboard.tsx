import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const navigate = useNavigate()
  const { session } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-svh bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Welcome back</h1>
        <p className="mt-2 text-sm text-slate-500">Logged in as {session?.user.email}</p>
        <p className="mt-4 text-sm text-slate-500">
          Dashboard screen isn't built yet — this is just here so login has somewhere to send you.
        </p>
        <button
          onClick={handleLogout}
          className="mt-6 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Log out
        </button>
      </div>
    </div>
  )
}
