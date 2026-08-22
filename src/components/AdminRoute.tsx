import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabaseClient'

// This is a UX-level gate only — the real security boundary is the
// is_admin-gated RLS policies in the database. Even if someone bypassed
// this component entirely, the queries the admin page runs would return
// nothing extra for a non-admin account.
export function AdminRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => setIsAdmin(Boolean(data?.is_admin)))
  }, [session])

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  if (isAdmin === null) return null
  if (!isAdmin) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
