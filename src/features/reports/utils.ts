import type { ReportFilters, ReportOptions } from './services/reports-api'

/** How many occupied deposits a scope selects (mirrors the backend filter: empty list = all). */
export function matchingDeposits(options: ReportOptions | undefined, filters: Pick<ReportFilters, 'zones' | 'deposits' | 'phases' | 'categories'>): number {
  if (!options) return 0
  const upper = (values: string[]) => new Set(values.map((value) => value.toUpperCase()))
  const zones = upper(filters.zones)
  const deposits = upper(filters.deposits)
  const phases = upper(filters.phases)
  const categories = upper(filters.categories)
  return options.deposits.filter((deposit) => {
    if (!deposit.content) return false
    if (zones.size && !zones.has((deposit.zone ?? '').toUpperCase())) return false
    if (deposits.size && !deposits.has(deposit.code.toUpperCase())) return false
    if (categories.size && !categories.has((deposit.category ?? '').toUpperCase())) return false
    if (phases.size && !phases.has((deposit.phase ?? 'NONE').toUpperCase())) return false
    return true
  }).length
}

/** Fermentation states a phase can require, per process, plus "no state recorded". */
export const ALCOHOLIC_STATES = ['NOT_STARTED', 'ACTIVE', 'SLOW', 'SUSPECTED_STOP', 'FINISHED', 'NONE']
export const MALOLACTIC_STATES = ['NOT_STARTED', 'ACTIVE', 'SLOW', 'FINISHED', 'NOT_EXPECTED', 'NONE']
