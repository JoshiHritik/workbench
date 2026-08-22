import type { ReactNode } from 'react'

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-slate-50 px-4">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      <svg
        className="pointer-events-none absolute -top-40 -right-40 h-[26rem] w-[26rem] text-slate-300"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="100" cy="100" rx="38" ry="90" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="100" cy="100" rx="90" ry="38" stroke="currentColor" strokeWidth="1" />
        <path d="M12,65 Q100,105 188,65" stroke="currentColor" strokeWidth="1" />
        <path d="M12,135 Q100,95 188,135" stroke="currentColor" strokeWidth="1" />
      </svg>

      <svg
        className="pointer-events-none absolute -bottom-48 -left-48 h-[30rem] w-[30rem] text-slate-200"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="100" cy="100" rx="38" ry="90" stroke="currentColor" strokeWidth="1" />
        <ellipse cx="100" cy="100" rx="90" ry="38" stroke="currentColor" strokeWidth="1" />
        <path d="M12,65 Q100,105 188,65" stroke="currentColor" strokeWidth="1" />
        <path d="M12,135 Q100,95 188,135" stroke="currentColor" strokeWidth="1" />
      </svg>

      <div className="relative z-10 w-full max-w-sm">{children}</div>
    </div>
  )
}
