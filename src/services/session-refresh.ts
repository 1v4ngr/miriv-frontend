import { apiUrl, getAccessToken, replaceAccessToken, setSessionRenewer } from './api-client'

/** Renew this long before the token runs out. */
const RENEW_BEFORE_MS = 5 * 60_000
/** Never schedule closer than this (a token about to expire is renewed almost at once). */
const MIN_DELAY_MS = 10_000

let timer: number | undefined
let inFlight: Promise<boolean> | undefined

/** Expiry of a JWT (ms since epoch) read from its payload; undefined if it cannot be read. */
function expiryOf(token: string): number | undefined {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number }
    return payload.exp ? payload.exp * 1000 : undefined
  } catch {
    return undefined
  }
}

/**
 * Asks the server for a fresh token (the server also renews one that just expired, within the session's
 * maximum length). Several tabs share one call
 * (the others pick the new token up from storage). Returns false when the session can no longer be
 * renewed (expired, maximum length reached, account disabled): the next request then ends the session.
 */
export function renewSession(): Promise<boolean> {
  const token = getAccessToken()
  if (!token) return Promise.resolve(false)
  inFlight ??= fetch(apiUrl('/api/auth/refresh'), { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    .then(async (response) => {
      if (!response.ok) return false
      const body = await response.json() as { accessToken?: string }
      if (!body.accessToken) return false
      // Only if nobody signed out or in meanwhile.
      if (getAccessToken() === token) replaceAccessToken(body.accessToken)
      return true
    })
    .catch(() => false) // offline: try again on the next check
    .finally(() => { inFlight = undefined; schedule() })
  return inFlight
}

/** Plans the next renewal from the current token's expiry (also right after signing in). */
export function schedule() {
  window.clearTimeout(timer)
  const token = getAccessToken()
  const expiry = token ? expiryOf(token) : undefined
  if (!expiry) return
  const delay = Math.max(MIN_DELAY_MS, expiry - Date.now() - RENEW_BEFORE_MS)
  timer = window.setTimeout(() => void renewSession(), delay)
}

/** After sleep, a hidden tab or a dropped network, timers may be late: check as soon as the app is back. */
function checkNow() {
  const token = getAccessToken()
  const expiry = token ? expiryOf(token) : undefined
  if (!expiry) return
  if (expiry - Date.now() <= RENEW_BEFORE_MS) void renewSession()
  else schedule()
}

/**
 * Keeps the session alive while the app is open: renews the token shortly before it expires, and checks
 * again when the tab becomes visible, the window gets focus or the network comes back. A token renewed by
 * another tab re-plans this one. Returns a function that stops it.
 */
export function startSessionRefresh(): () => void {
  setSessionRenewer(renewSession)
  const onVisible = () => { if (document.visibilityState === 'visible') checkNow() }
  const onStorage = (event: StorageEvent) => { if (event.key === null || event.key.startsWith('miriv.')) schedule() }
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('focus', checkNow)
  window.addEventListener('online', checkNow)
  window.addEventListener('storage', onStorage)
  checkNow()
  return () => {
    window.clearTimeout(timer)
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', checkNow)
    window.removeEventListener('online', checkNow)
    window.removeEventListener('storage', onStorage)
  }
}
