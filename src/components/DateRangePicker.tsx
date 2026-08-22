import { useEffect, useRef, useState } from 'react'
import { DropdownPortal } from './DropdownPortal'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function toISO(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDisplay(iso: string) {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onChange: (start: string, end: string) => void
}

export function DateRangePicker({ startDate, endDate, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [viewMonth, setViewMonth] = useState(() => {
    const base = startDate ? new Date(`${startDate}T00:00:00`) : new Date()
    return new Date(base.getFullYear(), base.getMonth(), 1)
  })
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

  const today = toISO(new Date())

  function handleDayClick(iso: string) {
    if (iso < today) return
    if (!startDate || (startDate && endDate)) {
      onChange(iso, '')
    } else if (iso < startDate) {
      onChange(iso, startDate)
    } else {
      onChange(startDate, iso)
    }
  }

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const startOffset = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (string | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISO(new Date(year, month, i + 1))),
  ]
  const now = new Date()
  const isCurrentOrPastViewMonth = year < now.getFullYear() || (year === now.getFullYear() && month <= now.getMonth())

  const label = startDate ? `${formatDisplay(startDate)}${endDate ? ` - ${formatDisplay(endDate)}` : ''}` : 'Add dates'

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full rounded-[50px] border border-slate-300 px-5 py-3.5 text-left text-sm text-slate-700 outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
      >
        {label}
      </button>

      {open && (
        <DropdownPortal anchorRef={containerRef}>
        <div ref={dropdownRef} className="w-80 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              disabled={isCurrentOrPastViewMonth}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-200 disabled:hover:bg-transparent"
              aria-label="Previous month"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <p className="text-sm font-medium text-slate-900">
              {viewMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month + 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
              aria-label="Next month"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((iso, idx) => {
              if (!iso) return <div key={idx} />
              const isEdge = iso === startDate || iso === endDate
              const inRange = Boolean(startDate && endDate && iso > startDate && iso < endDate)
              const isPast = iso < today
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => handleDayClick(iso)}
                  disabled={isPast}
                  className={`rounded-full py-1.5 text-sm transition ${
                    isPast
                      ? 'cursor-not-allowed text-slate-300'
                      : isEdge
                        ? 'bg-slate-900 text-white'
                        : inRange
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {Number(iso.slice(-2))}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <button
              type="button"
              onClick={() => onChange('', '')}
              className="font-medium text-slate-500 hover:text-slate-800"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="font-medium text-slate-900 hover:underline"
            >
              Done
            </button>
          </div>
        </div>
        </DropdownPortal>
      )}
    </div>
  )
}
