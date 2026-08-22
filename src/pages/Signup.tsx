import { Link } from 'react-router-dom'

export default function Signup() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Sign up</h1>
        <p className="mt-2 text-sm text-slate-500">Coming next — this screen isn't built yet.</p>
        <Link to="/login" className="mt-6 inline-block text-sm font-medium text-slate-900 hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  )
}
