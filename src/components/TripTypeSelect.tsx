import { useEffect, useRef, useState } from 'react'

const OPTIONS = ['Friendly', 'Couple', 'Family', 'Solo']

interface TripTypeSelectProps {
  value: string
  onChange: (value: string) => void
}

export function TripTypeSelect({ value, onChange }: TripTypeSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function select(option: string) {
    onChange(option)
    setOpen(false)
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-[50px] border border-slate-300 px-5 py-3.5 text-left text-sm outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
      >
        <span className={value ? 'text-slate-700' : 'text-slate-400'}>{value || 'Trip type'}</span>
        <svg
          className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-lg">
          <button
            type="button"
            onClick={() => select('')}
            className={`block w-full px-5 py-2 text-left text-sm hover:bg-slate-50 ${
              !value ? 'font-medium text-slate-900' : 'text-slate-500'
            }`}
          >
            Any
          </button>
          {OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => select(option)}
              className={`block w-full px-5 py-2 text-left text-sm hover:bg-slate-50 ${
                value === option ? 'font-medium text-slate-900' : 'text-slate-700'
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
