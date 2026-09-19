import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiRequestError } from '../../../services/api-client'
import { defaultDashboard } from '../defaults'
import { dashboardApi } from '../services/dashboard-api'
import type { Dashboard, DashboardSummary } from '../types'

export type SaveStatus = 'loading' | 'saved' | 'saving' | 'error' | 'conflict'

const SAVE_DELAY_MS = 800

// Module-level caches make switching dashboards instant: the cached one shows at once and is refreshed in the background.
let summariesCache: DashboardSummary[] | undefined
const dashboardCache = new Map<string, Dashboard>()
const seededKey = (id: string) => `miriv:dashboard-seeded:${id}`

export function wasSeeded(id: string): boolean {
  try { return localStorage.getItem(seededKey(id)) !== null } catch { return false }
}
/** Drops cached copies after a dashboard is deleted or the list changed. */
export function forgetDashboard(id?: string) {
  if (id) dashboardCache.delete(id)
  summariesCache = undefined
}

export function markSeeded(id: string) {
  try { localStorage.setItem(seededKey(id), '1') } catch { /* storage blocked: the template may be offered again */ }
}

/**
 * Loads the requested (or default) dashboard and saves edits with a debounce. Changes are applied to the local
 * state immediately; the last state is flushed when leaving. A version conflict stops saving until reload.
 */
export function useDashboard(requestedId?: string) {
  const [summaries, setSummaries] = useState<DashboardSummary[]>([])
  const [dashboard, setDashboard] = useState<Dashboard>()
  const [status, setStatus] = useState<SaveStatus>('loading')
  const [error, setError] = useState('')
  const latest = useRef<Dashboard | undefined>(undefined)
  const dirty = useRef(false)
  const blocked = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const [reloadToken, setReloadToken] = useState(0)

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current)
    const current = latest.current
    if (!current || !dirty.current || blocked.current) return
    dirty.current = false
    setStatus('saving')
    try {
      const saved = await dashboardApi.save(current)
      // Keep edits made while saving; only adopt the server's version and timestamps.
      const merged = dirty.current && latest.current ? { ...latest.current, version: saved.version, updatedAt: saved.updatedAt } : saved
      latest.current = merged
      dashboardCache.set(merged.id, merged)
      setDashboard(merged)
      setSummaries((list) => {
        const next = list.map((item) => (item.id === merged.id ? { ...item, name: merged.name, updatedAt: merged.updatedAt } : item))
        summariesCache = next
        return next
      })
      setStatus(dirty.current ? 'saving' : 'saved')
      setError('')
      if (dirty.current) timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS)
    } catch (cause) {
      dirty.current = true
      if (cause instanceof ApiRequestError && cause.code === 'STALE_DASHBOARD') { blocked.current = true; setStatus('conflict') }
      else setStatus('error')
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar el dashboard.')
    }
  }, [])

  useEffect(() => {
    let active = true
    blocked.current = false
    dirty.current = false
    setError('')
    // Show what is cached right away (stale-while-revalidate) instead of a loading state.
    const cachedList = summariesCache
    const cachedTarget = cachedList ? (cachedList.find((item) => item.id === requestedId) ?? (requestedId ? undefined : cachedList.find((item) => item.isDefault) ?? cachedList[0])) : undefined
    const cached = cachedTarget ? dashboardCache.get(cachedTarget.id) : undefined
    if (cachedList) setSummaries(cachedList)
    if (cached) { latest.current = cached; setDashboard(cached); setStatus('saved') }
    else { latest.current = undefined; setDashboard(undefined); setStatus('loading') }
    ;(async () => {
      try {
        const list = await dashboardApi.list()
        if (!active) return
        summariesCache = list
        setSummaries(list)
        const target = list.find((item) => item.id === requestedId) ?? list.find((item) => item.isDefault) ?? list[0]
        if (!target) { setStatus('error'); setError('No hay ningún dashboard.'); return }
        let loaded = await dashboardApi.get(target.id)
        if (!active) return
        // Edits made while this refresh was in flight win over the server copy we already show.
        if (dirty.current && latest.current?.id === loaded.id) return
        dashboardCache.set(loaded.id, loaded)
        if (loaded.widgets.length === 0 && !wasSeeded(loaded.id)) {
          loaded = { ...loaded, ...defaultDashboard() }
          markSeeded(loaded.id)
          dirty.current = true
        }
        latest.current = loaded
        setDashboard(loaded)
        setStatus(dirty.current ? 'saving' : 'saved')
        if (dirty.current) timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS)
      } catch (cause) {
        if (!active) return
        setStatus('error')
        setError(cause instanceof Error ? cause.message : 'No se ha podido cargar el dashboard.')
      }
    })()
    return () => { active = false; void flush() }
  }, [requestedId, reloadToken, flush])

  const update = useCallback((mutator: (current: Dashboard) => Dashboard) => {
    if (!latest.current) return
    const next = mutator(latest.current)
    if (next === latest.current) return
    latest.current = next
    dashboardCache.set(next.id, next)
    dirty.current = true
    setDashboard(next)
    if (!blocked.current) {
      setStatus('saving')
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS)
    }
  }, [flush])

  return {
    summaries, dashboard, status, error, update, flush,
    retry: () => { blocked.current = false; void flush() },
    reload: () => setReloadToken((value) => value + 1),
  }
}
