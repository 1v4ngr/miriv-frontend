import { useCallback, useEffect, useState } from 'react'
import { incidentsApi } from '../../incidents/services/incidents-api'
import { laboratoryApi } from '../../laboratory/services/laboratory-api'

export interface NavigationBadges {
  laboratory?: number
  incidents?: number
}

export function useNavigationBadges(): NavigationBadges {
  const [badges, setBadges] = useState<NavigationBadges>({})

  const refreshBadges = useCallback(async () => {
    try {
      const [samples, incidents] = await Promise.all([laboratoryApi.getSamples(), incidentsApi.getAll()])
      setBadges({
        laboratory: samples.filter((sample) => sample.overdue || sample.status === 'Pendiente validar').length,
        incidents: incidents.filter((incident) => incident.status !== 'closed').length,
      })
    } catch {
      setBadges({})
    }
  }, [])

  useEffect(() => {
    void refreshBadges()
    window.addEventListener('focus', refreshBadges)
    return () => window.removeEventListener('focus', refreshBadges)
  }, [refreshBadges])

  return badges
}
