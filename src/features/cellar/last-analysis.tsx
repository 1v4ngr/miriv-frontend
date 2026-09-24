import { formatDate } from '../../lib/format'
import type { Deposit } from './types'
import { activeOccupation } from './utils'

/** Past this many days without a sample the deposit reads as overdue (amber). */
export const ANALYSIS_STALE_DAYS = 7

export type AnalysisFilter = '' | 'today' | 'week' | 'stale' | 'never' | 'range'
export interface AnalysisRange { from: string; to: string }

export const analysisFilterLabels: Record<Exclude<AnalysisFilter, ''>, string> = {
  today: 'Hoy', week: 'Últimos 7 días', stale: `Más de ${ANALYSIS_STALE_DAYS} días`, never: 'Sin análisis', range: 'Entre fechas',
}

/** Last sample of the content now in the deposit: undefined for an empty deposit, null if never analysed. */
export function lastSampleOf(deposit: Deposit): string | null | undefined {
  const occupation = activeOccupation(deposit)
  return occupation ? occupation.lastSampleAt ?? null : undefined
}

/** Whole calendar days between that instant and today (0 = today), in local time. */
export function daysSince(iso: string): number {
  const day = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return Math.round((day(new Date()) - day(new Date(iso))) / 86_400_000)
}

export function relativeDays(days: number): string {
  return days <= 0 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} d`
}

/** Local yyyy-mm-dd of an instant, to compare with date inputs. */
const localDay = (iso: string) => { const date = new Date(iso); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` }

export function matchesAnalysis(deposit: Deposit, filter: AnalysisFilter, range: AnalysisRange): boolean {
  if (!filter) return true
  const last = lastSampleOf(deposit)
  if (last === undefined) return false // empty deposits have nothing to analyse
  if (filter === 'never') return last === null
  if (last === null) return filter === 'stale'
  const days = daysSince(last)
  if (filter === 'today') return days === 0
  if (filter === 'week') return days <= ANALYSIS_STALE_DAYS
  if (filter === 'stale') return days > ANALYSIS_STALE_DAYS
  const day = localDay(last)
  return (!range.from || day >= range.from) && (!range.to || day <= range.to)
}

/** Pill text of the active filter ("Análisis 01/09 – 15/09", "Sin análisis"…). */
export function analysisFilterText(filter: AnalysisFilter, range: AnalysisRange): string {
  if (filter !== 'range') return filter ? `Análisis: ${analysisFilterLabels[filter].toLocaleLowerCase('es')}` : ''
  const short = (value: string) => (value ? formatDate(`${value}T12:00:00`) : '…')
  return `Análisis ${short(range.from)} – ${short(range.to)}`
}

/** "hace 3 d" over the date; amber when overdue or never analysed; a dash for empty deposits. */
export function LastAnalysis({ deposit, compact = false }: { deposit: Deposit; compact?: boolean }) {
  const last = lastSampleOf(deposit)
  if (last === undefined) return <span className="text-[11px] text-muted">—</span>
  if (last === null) return <span className="text-[11px] font-medium text-[#8a6412]">Sin análisis</span>
  const days = daysSince(last)
  const tone = days > ANALYSIS_STALE_DAYS ? 'text-[#8a6412]' : 'text-copy'
  return compact
    ? <span className={`text-[11px] ${tone}`}>Análisis {relativeDays(days)}</span>
    : <span className="block"><span className={`block text-[11.5px] font-medium ${tone}`}>{relativeDays(days)}</span><span className="block text-[10px] text-muted">{formatDate(last)}</span></span>
}
