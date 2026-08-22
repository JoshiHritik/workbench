import { useState } from 'react'
import { useCurrency, CURRENCY_OPTIONS } from '../context/CurrencyContext'

export function CurrencySelect() {
  const { currency, setCurrency } = useCurrency()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 items-center gap-1 rounded-full border border-slate-300 bg-white/80 px-3 text-sm font-medium text-slate-600 backdrop-blur-sm transition hover:bg-white"
      >
        {currency}
        <svg
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {CURRENCY_OPTIONS.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  setCurrency(option.code)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-slate-50 ${
                  currency === option.code ? 'font-medium text-slate-900' : 'text-slate-700'
                }`}
              >
                <span>
                  {option.label} <span className="text-slate-400">({option.code})</span>
                </span>
                <span className="text-slate-400">{option.symbol}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
