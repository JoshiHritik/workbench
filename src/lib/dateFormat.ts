export const DATE_FORMAT_OPTIONS = [
  { value: 'local', label: 'Automatic (Aug 22, 2026)' },
  { value: 'dmy', label: 'Day/Month/Year (22/08/2026)' },
  { value: 'mdy', label: 'Month/Day/Year (08/22/2026)' },
] as const

export type DateFormatPref = (typeof DATE_FORMAT_OPTIONS)[number]['value']

const KEY = 'globetrotter_date_format'

export function loadDateFormatPref(): DateFormatPref {
  const raw = localStorage.getItem(KEY)
  return raw === 'dmy' || raw === 'mdy' ? raw : 'local'
}

export function saveDateFormatPref(pref: DateFormatPref) {
  localStorage.setItem(KEY, pref)
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

/** Formats a single date. Respects the stored date-format preference. */
export function formatDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  const pref = loadDateFormatPref()
  if (pref === 'dmy') return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
  if (pref === 'mdy') return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()}`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Formats a start–end range, falling back to a placeholder when either side is missing. */
export function formatDateRange(start: string | null, end: string | null, placeholder = 'Dates not set'): string {
  if (!start || !end) return placeholder
  return `${formatDate(start)} – ${formatDate(end)}`
}
