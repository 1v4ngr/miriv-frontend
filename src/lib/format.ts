export const CENTER_TIME_ZONE = 'Europe/Madrid'

function parts(date: Date) {
  const values = new Intl.DateTimeFormat('en-CA', {
    timeZone: CENTER_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: string) => values.find((part) => part.type === type)?.value ?? ''
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute') }
}

/** Today's date in the center's time zone, as YYYY-MM-DD (value for <input type="date">). */
export function todayInCenter(now: Date = new Date()): string {
  const p = parts(now)
  return `${p.year}-${p.month}-${p.day}`
}

/** Current time in the center's time zone, as HH:mm (value for <input type="time">). */
export function nowTimeInCenter(now: Date = new Date()): string {
  const p = parts(now)
  return `${p.hour}:${p.minute}`
}

/** Current year in the center's time zone. */
export function currentYearInCenter(now: Date = new Date()): number {
  return Number(parts(now).year)
}

function toDate(value: string | Date | null | undefined): Date | undefined {
  if (!value) return undefined
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value
  // A plain date (YYYY-MM-DD) is a calendar day, not an instant: pin it to midday to avoid shifting the day.
  const text = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value
  const date = new Date(text)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** "16 sep 2026" */
export function formatDate(value: string | Date | null | undefined, fallback = '—'): string {
  const date = toDate(value)
  if (!date) return fallback
  return new Intl.DateTimeFormat('es-ES', { timeZone: CENTER_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

/** "16 sep 2026, 09:15" */
export function formatDateTime(value: string | Date | null | undefined, fallback = '—'): string {
  const date = toDate(value)
  if (!date) return fallback
  return new Intl.DateTimeFormat('es-ES', { timeZone: CENTER_TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date)
}

/** "hace 3 h", "hace 2 días", "en 5 días" */
export function formatRelative(value: string | Date | null | undefined, now: Date = new Date(), fallback = '—'): string {
  const date = toDate(value)
  if (!date) return fallback
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000)
  const abs = Math.abs(seconds)
  const rtf = new Intl.RelativeTimeFormat('es-ES', { numeric: 'auto' })
  if (abs < 60) return rtf.format(seconds, 'second')
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), 'hour')
  return rtf.format(Math.round(seconds / 86400), 'day')
}

/** Converts the value of <input type="datetime-local"> (center local time) to an ISO instant. */
export function localDateTimeToIso(value: string): string {
  return new Date(value).toISOString()
}

export function formatLiters(value: number): string {
  return new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 }).format(value)
}

/** "0,72" — Spanish decimal comma with a fixed number of decimals. */
export function formatNumber(value: number | null | undefined, decimals = 2, fallback = '—'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback
  return new Intl.NumberFormat('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value)
}
