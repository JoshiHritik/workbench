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

function addDays(date: Date, days: number) {
  const copy = new Date(date)
  copy.setDate(copy.getDate() + days)
  return copy
}

function buildPresets(): { label: string; start: string; end: string }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const daysUntilSaturday = (6 - today.getDay() + 7) % 7
  const saturday = addDays(today, daysUntilSaturday)
  const sunday = addDays(saturday, 1)

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  return [
    { label: 'This weekend', start: toISO(saturday), end: toISO(sunday) },
    { label: 'Next 7 days', start: toISO(today), end: toISO(addDays(today, 6)) },
    { label: 'This month', start: toISO(monthStart), end: toISO(monthEnd) },
  ]
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

  function handleDayClick(iso: string) {
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

  const label = startDate ? `${formatDisplay(startDate)}${endDate ? ` - ${formatDisplay(endDate)}` : ''}` : 'Add dates'
  const today = toISO(new Date())
  const presets = buildPresets()

  function applyPreset(start: string, end: string) {
    onChange(start, end)
    const startDateObj = new Date(`${start}T00:00:00`)
    setViewMonth(new Date(startDateObj.getFullYear(), startDateObj.getMonth(), 1))
  }

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
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.start, preset.end)}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(year, month - 1, 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
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
              const isToday = iso === today
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => handleDayClick(iso)}
                  className={`rounded-full py-1.5 text-sm transition ${
                    isEdge
                      ? 'bg-slate-900 text-white'
                      : inRange
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-700 hover:bg-slate-100'
                  } ${isToday && !isEdge ? 'ring-1 ring-inset ring-slate-400' : ''}`}
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
