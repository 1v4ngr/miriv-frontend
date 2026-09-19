import { formatNumber } from '../../lib/format'
import type { ParameterInfo, Qualifier, SeriesPoint, Status, TargetRange } from './services/tracking-api'

/** Analytical samples older than this (days) are shown as out of date in the matrix. */
export const STALE_DAYS = 7

export const statusLabel: Record<Status, string> = {
  OK: 'Dentro de rango',
  WARN: 'Aviso',
  CRIT: 'Crítico',
  UNKNOWN: 'No concluyente (< límite)',
  NONE: 'Sin objetivo',
}

/** Tailwind classes for a status cell / chip. */
export const statusClass: Record<Status, string> = {
  OK: 'bg-[#e6f1e9] text-[#1f5c3a]',
  WARN: 'bg-[#f8ecc9] text-[#6b5a10]',
  CRIT: 'bg-[#f7dadf] text-[#8e1f33]',
  UNKNOWN: 'bg-[#eee9f4] text-[#5b4a72]',
  NONE: 'bg-transparent text-copy',
}

/** "0,72", "< 0,05", "n.d." — the measured value as the lab reported it. */
export function formatReading(value: number | null, qualifier: Qualifier | string, limit: number | null, decimals: number): string {
  if (qualifier === 'LESS_THAN') return `< ${formatNumber(limit, decimals)}`
  if (qualifier === 'NOT_DETECTED') return 'n.d.'
  if (qualifier === 'NOT_MEASURED') return '—'
  return formatNumber(value, decimals)
}

export function formatPoint(point: SeriesPoint, parameter?: ParameterInfo): string {
  return formatReading(point.value, point.qualifier, point.limit, parameter?.decimals ?? 2)
}

/** Numeric value used to draw a point: the value, or the limit of a "< limit" result; null when there is nothing to plot. */
export function plotValue(point: SeriesPoint): number | null {
  if (point.qualifier === 'NONE') return point.value
  if (point.qualifier === 'LESS_THAN') return point.limit
  return null
}

const DAY_MS = 86_400_000
export function daysBetween(fromIso: string | null | undefined, toIso: string): number {
  if (!fromIso) return 0
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / DAY_MS
}

/** Content colours are stable per position so a deposit keeps its colour across parameters. */
export const contentColors = ['#6d4656', '#2e7d9a', '#c0782a', '#4d8b4f', '#8e4fa8', '#b8423f', '#3f6fb8', '#8a8f2a', '#d0577c', '#4a5568']

/** Same rule as the backend (ParameterTargetService.evaluate): OK / WARN / CRIT, UNKNOWN for inconclusive "< limit". */
export function evaluateStatus(point: Pick<SeriesPoint, 'value' | 'qualifier' | 'limit'>, range?: TargetRange): Status {
  if (!range) return 'NONE'
  if (point.qualifier !== 'NONE') {
    if (point.qualifier === 'NOT_MEASURED') return 'NONE'
    if (point.qualifier !== 'LESS_THAN' || point.limit === null) return 'UNKNOWN'
    const limit = point.limit
    if (range.critMin !== null && limit <= range.critMin) return 'CRIT'
    if (range.warnMin !== null && limit <= range.warnMin) return 'WARN'
    const lowerBound = range.critMin !== null || range.warnMin !== null
    const upperReachable = (range.critMax !== null && limit > range.critMax) || (range.warnMax !== null && limit > range.warnMax)
    return lowerBound || upperReachable ? 'UNKNOWN' : 'OK'
  }
  const value = point.value
  if (value === null) return 'NONE'
  if ((range.critMin !== null && value < range.critMin) || (range.critMax !== null && value > range.critMax)) return 'CRIT'
  if ((range.warnMin !== null && value < range.warnMin) || (range.warnMax !== null && value > range.warnMax)) return 'WARN'
  return 'OK'
}

/** "2 d 4 h" between two instants. */
export function formatSpan(fromIso: string, toIso: string): string {
  const totalHours = Math.round(Math.abs(new Date(toIso).getTime() - new Date(fromIso).getTime()) / 3_600_000)
  const days = Math.floor(totalHours / 24)
  const hours = totalHours % 24
  return days > 0 ? `${days} d ${hours} h` : `${hours} h`
}

/** "hace 3 d" / "hoy" for a number of days. */
export function formatAge(days: number | null | undefined): string {
  if (days === null || days === undefined) return 'sin análisis'
  if (days <= 0) return 'hoy'
  return `hace ${days} d`
}
