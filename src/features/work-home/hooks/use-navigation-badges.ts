import { useCallback, useEffect, useState } from 'react'
import { laboratoryApi } from '../../laboratory/services/laboratory-api'
import { trackingApi } from '../../tracking/services/tracking-api'

export interface NavigationBadges {
  laboratory?: number
  /** Tracking alerts that hold right now and have not been acknowledged. */
  tracking?: number
}

/** Samples still open in the laboratory: anything not validated or invalidated. */
const CLOSED_SAMPLE_STATUSES = new Set(['Validado', 'Invalidado'])
const REFRESH_MS = 60_000

export function useNavigationBadges(): NavigationBadges {
  const [badges, setBadges] = useState<NavigationBadges>({})

  const refreshBadges = useCallback(async () => {
    // Each count is independent: one failing endpoint (e.g. no permission) must not blank the other.
    const [samples, alerts] = await Promise.allSettled([laboratoryApi.getSampleSummaries(), trackingApi.alerts()])
    setBadges({
      laboratory: samples.status === 'fulfilled'
        ? samples.value.filter((sample) => !CLOSED_SAMPLE_STATUSES.has(sample.status)).length
        : undefined,
      tracking: alerts.status === 'fulfilled' ? alerts.value.length : undefined,
    })
  }, [])

  useEffect(() => {
    void refreshBadges()
    // Refresh on focus, on every in-app navigation (hash router) and periodically.
    window.addEventListener('focus', refreshBadges)
    window.addEventListener('hashchange', refreshBadges)
    const timer = window.setInterval(refreshBadges, REFRESH_MS)
    return () => {
      window.removeEventListener('focus', refreshBadges)
      window.removeEventListener('hashchange', refreshBadges)
      window.clearInterval(timer)
    }
  }, [refreshBadges])

  return badges
}