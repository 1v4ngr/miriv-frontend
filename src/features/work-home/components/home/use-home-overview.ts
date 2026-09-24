import { useEffect, useState } from 'react'
import { workHomeApi } from '../../services/work-home-api'
import type { WorkHomeData } from '../../types'
import { cellarApi } from '../../../cellar/services/cellar-api'
import type { Deposit } from '../../../cellar/types'
import { reportsApi, type ReportPhase } from '../../../reports/services/reports-api'
import { trackingApi, type OverviewResponse } from '../../../tracking/services/tracking-api'

export interface HomeOverview {
  loading: boolean
  error: string
  home?: WorkHomeData
  deposits: Deposit[]
  /** Active phases in evaluation order and the current phase of each deposit (same rule as the deposit detail). */
  phases: ReportPhase[]
  phaseByDeposit: Map<string, ReportPhase | null>
  tracking?: OverviewResponse
}

/**
 * Everything the home page draws, from the endpoints the other screens already use (deposits list, report
 * options for phases, tracking overview for readings), loaded in parallel. Only the home summary is required;
 * the rest fail soft so one broken block never blanks the page.
 */
export function useHomeOverview(): HomeOverview {
  const [state, setState] = useState<HomeOverview>({ loading: true, error: '', deposits: [], phases: [], phaseByDeposit: new Map() })

  useEffect(() => {
    let active = true
    const soft = <T,>(promise: Promise<T>) => promise.catch(() => undefined)
    Promise.all([workHomeApi.getWorkHome(), soft(cellarApi.getDeposits()), soft(reportsApi.options()), soft(trackingApi.overview())])
      .then(([home, deposits, options, tracking]) => {
        if (!active) return
        const phases = (options?.phases ?? []).filter((phase) => phase.active)
        const phaseByDeposit = new Map((options?.deposits ?? []).map((item) => [item.code, phases.find((phase) => phase.code === item.phase) ?? null]))
        setState({ loading: false, error: '', home, deposits: deposits ?? [], phases, phaseByDeposit, tracking })
      })
      .catch(() => { if (active) setState((current) => ({ ...current, loading: false, error: 'No se ha podido cargar el inicio.' })) })
    return () => { active = false }
  }, [])

  return state
}
