import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { NotificationsMenu } from './NotificationsMenu'
import { CurrencySelect } from './CurrencySelect'

interface AppHeaderProps {
  /** Set when the header sits directly on top of a dark photo (the Dashboard hero) — blurred background AND white text, since dark text would be unreadable there. */
  overHero?: boolean
  /** Set when the page behind the header has decorative imagery but is still light (e.g. Create Trip's faint background) — blurred background, but keeps dark text since white would be unreadable on a light page. */
  blur?: boolean
}

export function AppHeader({ overHero = false, blur = false }: AppHeaderProps) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setIsAdmin(Boolean(data?.is_admin)))
  }, [session])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const name = (session?.user.user_metadata?.full_name as string | undefined) || session?.user.email

  return (
    <header className={`relative z-20 ${overHero || blur ? 'bg-slate-900/10 backdrop-blur-sm' : 'bg-transparent'}`}>
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5 sm:px-6">
        <Link
          to="/dashboard"
          className={`font-display text-lg font-bold ${overHero ? 'text-white' : 'text-slate-900'}`}
        >
          GlobeTrotter
        </Link>

        <div className="flex items-center gap-2">
          <CurrencySelect />
          <NotificationsMenu />

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={name ? `Account menu for ${name}` : 'Account menu'}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 bg-white/80 text-slate-600 backdrop-blur-sm transition hover:bg-white"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                  {name && <p className="truncate border-b border-slate-100 px-4 py-2 text-xs text-slate-400">{name}</p>}
                  <Link
                    to="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Settings
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setMenuOpen(false)}
                      className="block w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Admin
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full border-t border-slate-100 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
