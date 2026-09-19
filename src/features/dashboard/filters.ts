import type { Period } from '../tracking/favorites'
import type { OverviewResponse } from '../tracking/services/tracking-api'
import type { GlobalFilters } from './types'

/**
 * Contents a panel actually shows: its own, or the global ones when it follows them; a global category
 * narrows the list (and, with no contents chosen anywhere, selects every tank of that category).
 */
export function effectiveContents(own: string[], followGlobal: boolean, globals: GlobalFilters, overview: OverviewResponse | undefined): string[] {
  if (!followGlobal) return own
  let contents = globals.contents.length ? globals.contents : own
  if (globals.category && overview) {
    const inCategory = new Set(overview.rows.filter((row) => row.category === globals.category).map((row) => row.content))
    contents = contents.length ? contents.filter((code) => inCategory.has(code)) : [...inCategory]
  }
  return contents
}

export function effectivePeriod(own: Period, followGlobal: boolean, globals: GlobalFilters): Period {
  return followGlobal ? globals.period : own
}
