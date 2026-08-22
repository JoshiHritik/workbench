import { useEffect, useRef, useState } from 'react'
import { DropdownPortal } from './DropdownPortal'
import { CURRENCY_OPTIONS } from '../context/CurrencyContext'

interface CurrencyFullSelectProps {
  value: string
  onChange: (value: string) => void
}

export function CurrencyFullSelect({ value, onChange }: CurrencyFullSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (!containerRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  const selected = CURRENCY_OPTIONS.find((o) => o.code === value) ?? CURRENCY_OPTIONS[0]

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-[50px] border border-slate-300 px-5 py-3 text-left text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
      >
        <span>
          {selected.label} ({selected.code})
        </span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <DropdownPortal anchorRef={containerRef}>
          <div
            ref={dropdownRef}
            className="max-h-64 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {CURRENCY_OPTIONS.map((option) => (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  onChange(option.code)
                  setOpen(false)
                }}
                className={`block w-full px-5 py-2 text-left text-sm hover:bg-slate-50 ${
                  value === option.code ? 'font-medium text-slate-900' : 'text-slate-700'
                }`}
              >
                {option.label} ({option.code}) {option.symbol}
              </button>
            ))}
          </div>
        </DropdownPortal>
      )}
    </div>
  )
}
