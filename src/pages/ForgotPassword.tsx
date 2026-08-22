import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/AuthLayout'

export default function ForgotPassword() {
  return (
    <AuthLayout>
      <div className="rounded-xl border border-slate-200 bg-white/90 p-8 text-center shadow-lg backdrop-blur-sm">
        <h1 className="text-xl font-semibold text-slate-900">Reset password</h1>
        <p className="mt-2 text-sm text-slate-500">Coming next — this screen isn't built yet.</p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-slate-900 hover:underline">
          Back to login
        </Link>
      </div>
    </AuthLayout>
  )
}
