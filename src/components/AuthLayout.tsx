import type { ReactNode } from 'react'

const TRAVEL_IMAGE_URL =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh bg-white">
      <div className="flex w-full items-center justify-center px-4 py-12 md:w-1/2 md:px-12">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      <div className="relative hidden w-1/2 md:block">
        <img
          src={TRAVEL_IMAGE_URL}
          alt="Mountain landscape"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/10 to-transparent" />
        <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-white to-transparent" />
        <div className="absolute bottom-12 left-10 right-10 text-white">
          <p className="text-2xl font-semibold">Plan your next adventure</p>
          <p className="mt-2 text-sm text-white/80">
            Build multi-city itineraries, track your budget, and share the journey with friends.
          </p>
        </div>
      </div>
    </div>
  )
}
