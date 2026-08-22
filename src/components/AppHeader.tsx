import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function AppHeader() {
  const navigate = useNavigate()
  const { session } = useAuth()

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const name = (session?.user.user_metadata?.full_name as string | undefined) || session?.user.email

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
        <span className="text-lg font-semibold text-slate-900">GlobeTrotter</span>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-slate-500 sm:inline">{name}</span>
          <button
            onClick={handleLogout}
            className="rounded-[50px] border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  )
}
