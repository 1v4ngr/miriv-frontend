import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiRequestError } from '../../../services/api-client'
import { defaultDashboard } from '../defaults'
import { dashboardApi } from '../services/dashboard-api'
import type { Dashboard, DashboardSummary } from '../types'

export type SaveStatus = 'loading' | 'saved' | 'saving' | 'error' | 'conflict'

const SAVE_DELAY_MS = 800
const seededKey = (id: string) => `miriv:dashboard-seeded:${id}`

function wasSeeded(id: string): boolean {
  try { return localStorage.getItem(seededKey(id)) !== null } catch { return false }
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
  const latest = useRef<Dashboard>()
  const dirty = useRef(false)
  const blocked = useRef(false)
  const timer = useRef<number>()
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
      setDashboard(merged)
      setSummaries((list) => list.map((item) => (item.id === merged.id ? { ...item, name: merged.name, updatedAt: merged.updatedAt } : item)))
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
    setStatus('loading')
    setError('')
    ;(async () => {
      try {
        const list = await dashboardApi.list()
        if (!active) return
        setSummaries(list)
        const target = list.find((item) => item.id === requestedId) ?? list.find((item) => item.isDefault) ?? list[0]
        if (!target) { setStatus('error'); setError('No hay ningún dashboard.'); return }
        let loaded = await dashboardApi.get(target.id)
        if (!active) return
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
