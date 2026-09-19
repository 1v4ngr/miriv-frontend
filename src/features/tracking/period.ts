import type { Period } from './favorites'

export const PERIODS: Array<{ value: Period; label: string }> = [
  { value: '7', label: 'Últimos 7 días' },
  { value: '30', label: 'Últimos 30 días' },
  { value: '90', label: 'Últimos 90 días' },
  { value: 'all', label: 'Campaña completa' },
]

/** ISO instant where a period starts, or undefined for the whole campaign. */
export function periodStart(period: Period): string | undefined {
  return period === 'all' ? undefined : new Date(Date.now() - Number(period) * 86_400_000).toISOString()
}
