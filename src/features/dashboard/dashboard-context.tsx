import { createContext, useContext } from 'react'
import type { OverviewResponse } from '../tracking/services/tracking-api'
import type { GlobalFilters } from './types'

export interface DashboardContextValue {
  globals: GlobalFilters
  setGlobals: (next: GlobalFilters) => void
  /** Occupied tanks with their latest key readings; loaded once per dashboard and shared by every panel. */
  overview: OverviewResponse | undefined
  /** Points every "global" panel at one content (clicking a row of the matrix). */
  focus: (contentCode: string) => void
}

const noop = () => undefined
export const DashboardContext = createContext<DashboardContextValue>({
  globals: { period: '30', contents: [], category: '' }, setGlobals: noop, overview: undefined, focus: noop,
})

export const useDashboardContext = () => useContext(DashboardContext)
