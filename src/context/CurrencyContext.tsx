import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export interface CurrencyOption {
  code: string
  symbol: string
  label: string
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
  { code: 'JPY', symbol: '¥', label: 'Japanese Yen' },
  { code: 'AUD', symbol: 'A$', label: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar' },
  { code: 'CNY', symbol: '¥', label: 'Chinese Yuan' },
  { code: 'THB', symbol: '฿', label: 'Thai Baht' },
]

const STORAGE_KEY = 'globetrotter_currency'

interface CurrencyContextValue {
  currency: string
  symbol: string
  setCurrency: (code: string) => void
  format: (amountInInr: number) => string
  /** Converts an amount typed in the currently-selected currency back to INR, for storage. */
  toInr: (amountInSelectedCurrency: number) => number
  ratesLoading: boolean
}

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined)

// All amounts in the database are stored in INR (the app's base currency).
// We convert for display only, using real exchange rates from Frankfurter
// (ECB-backed, free, no API key) — never just relabeling the same number with
// a different symbol, which would misrepresent the actual cost.
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState(() => localStorage.getItem(STORAGE_KEY) || 'INR')
  const [rates, setRates] = useState<Record<string, number>>({ INR: 1 })
  const [ratesLoading, setRatesLoading] = useState(false)

  useEffect(() => {
    if (currency === 'INR' || rates[currency]) return
    let cancelled = false
    setRatesLoading(true)
    fetch(
      `https://api.frankfurter.dev/v1/latest?base=INR&symbols=${CURRENCY_OPTIONS.filter((c) => c.code !== 'INR')
        .map((c) => c.code)
        .join(',')}`,
    )
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.rates) {
          setRates((prev) => ({ ...prev, ...data.rates, INR: 1 }))
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setRatesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [currency, rates])

  function setCurrency(code: string) {
    setCurrencyState(code)
    localStorage.setItem(STORAGE_KEY, code)
  }

  function format(amountInInr: number): string {
    const option = CURRENCY_OPTIONS.find((c) => c.code === currency) ?? CURRENCY_OPTIONS[0]
    const rate = rates[currency]
    if (currency !== 'INR' && !rate) {
      // Rate not loaded yet — show the real INR amount rather than a wrong number.
      return `₹${amountInInr.toLocaleString('en-IN')}`
    }
    const converted = amountInInr * (rate ?? 1)
    const decimals = converted >= 1000 || currency === 'JPY' ? 0 : 2
    return `${option.symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`
  }

  function toInr(amountInSelectedCurrency: number): number {
    const rate = rates[currency]
    if (currency === 'INR' || !rate) return amountInSelectedCurrency
    return amountInSelectedCurrency / rate
  }

  const symbol = (CURRENCY_OPTIONS.find((c) => c.code === currency) ?? CURRENCY_OPTIONS[0]).symbol

  return (
    <CurrencyContext.Provider value={{ currency, symbol, setCurrency, format, toInr, ratesLoading }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider')
  return ctx
}
