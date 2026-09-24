const PERSISTENT_TOKEN_KEY = 'miriv.access-token'
const SESSION_TOKEN_KEY = 'miriv.session-token'
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export interface ApiViolation { field: string; message: string }

export class ApiRequestError extends Error {
  readonly status: number
  readonly code?: string
  readonly violations: ApiViolation[]
  readonly details: Record<string, unknown>

  constructor(status: number, message: string, options: { code?: string; violations?: ApiViolation[]; details?: Record<string, unknown> } = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
    this.code = options.code
    this.violations = options.violations ?? []
    this.details = options.details ?? {}
  }

  /** True when we do not know whether the server applied the change (network drop, timeout, 502–504). */
  get uncertain(): boolean {
    return this.status === 0 || this.status === 502 || this.status === 503 || this.status === 504
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  0: 'No hay conexión con el servidor. Comprueba la red antes de repetir la acción.',
  400: 'Hay datos no válidos en el formulario.',
  401: 'Tu sesión ha caducado. Vuelve a iniciar sesión.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'No se ha encontrado el elemento solicitado.',
  409: 'Los datos han cambiado mientras trabajabas. Revisa y vuelve a intentarlo.',
  422: 'La operación no cumple una regla de negocio.',
  429: 'Demasiados intentos. Espera unos minutos.',
}

export function getAccessToken(): string | null {
  return localStorage.getItem(PERSISTENT_TOKEN_KEY) ?? sessionStorage.getItem(SESSION_TOKEN_KEY)
}

export function saveAccessToken(token: string, rememberSession: boolean): void {
  localStorage.removeItem(PERSISTENT_TOKEN_KEY)
  sessionStorage.removeItem(SESSION_TOKEN_KEY)
  const storage = rememberSession ? localStorage : sessionStorage
  storage.setItem(rememberSession ? PERSISTENT_TOKEN_KEY : SESSION_TOKEN_KEY, token)
}

/** Replaces the token after a renewal, in the same storage it was in (kept or per-browser-session). */
export function replaceAccessToken(token: string): void {
  if (localStorage.getItem(PERSISTENT_TOKEN_KEY)) localStorage.setItem(PERSISTENT_TOKEN_KEY, token)
  else sessionStorage.setItem(SESSION_TOKEN_KEY, token)
}

/** Base URL of the API, for calls that must not go through apiRequest (the renewal itself). */
export function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`
}

export function clearAccessToken(): void {
  localStorage.removeItem(PERSISTENT_TOKEN_KEY)
  sessionStorage.removeItem(SESSION_TOKEN_KEY)
}

export function hasActiveSession(): boolean {
  return Boolean(getAccessToken())
}

// Set by session-refresh (avoids an import cycle): renews the token once when a request is refused.
let renew: (() => Promise<boolean>) | undefined
export function setSessionRenewer(renewer: () => Promise<boolean>): void { renew = renewer }

export async function apiRequest<T>(path: string, init: RequestInit = {}, retried = false): Promise<T> {
  const headers = new Headers(init.headers)
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers })
  } catch {
    throw new ApiRequestError(0, DEFAULT_MESSAGES[0], { code: 'NETWORK' })
  }

  const isAuthCall = path.startsWith('/api/auth/')
  // A token that ran out while the app slept is renewed once and the request repeated, before giving up.
  if (response.status === 401 && !isAuthCall && !retried && token && renew && await renew()) return apiRequest<T>(path, init, true)
  if (response.status === 401 && !isAuthCall) {
    clearAccessToken()
    window.dispatchEvent(new Event('miriv:session-expired'))
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as
      | { message?: string; code?: string; violations?: ApiViolation[]; [key: string]: unknown }
      | undefined
    const violations = payload?.violations ?? []
    const fallback = DEFAULT_MESSAGES[response.status] ?? 'No se ha podido completar la operación.'
    const base = payload?.message && payload.message !== 'Validation failed.' ? payload.message : fallback
    const message = violations.length ? `${base} ${violations.map((item) => `${item.field}: ${item.message}`).join(' · ')}` : base
    throw new ApiRequestError(response.status, message, { code: payload?.code, violations, details: payload ?? {} })
  }
  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

/** Helper for "not found returns undefined" lookups. */
export async function apiRequestOrUndefined<T>(path: string, init?: RequestInit): Promise<T | undefined> {
  try {
    return await apiRequest<T>(path, init)
  } catch (error) {
    if (error instanceof ApiRequestError && error.status === 404) return undefined
    throw error
  }
}

/** Authenticated file download (reports): returns the body as a Blob plus the server's file name. */
export async function apiDownload(path: string): Promise<{ blob: Blob; fileName: string | null }> {
  const headers = new Headers()
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  let response: Response
  try {
    response = await fetch(`${apiBaseUrl}${path}`, { headers })
  } catch {
    throw new ApiRequestError(0, DEFAULT_MESSAGES[0], { code: 'NETWORK' })
  }
  if (response.status === 401) {
    clearAccessToken()
    window.dispatchEvent(new Event('miriv:session-expired'))
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { message?: string; code?: string } | undefined
    throw new ApiRequestError(response.status, payload?.message ?? DEFAULT_MESSAGES[response.status] ?? 'No se ha podido descargar el fichero.', { code: payload?.code })
  }
  const disposition = response.headers.get('Content-Disposition') ?? ''
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1]
  const plain = /filename="?([^";]+)"?/i.exec(disposition)?.[1]
  const fileName = encoded ? decodeURIComponent(encoded) : plain ?? null
  return { blob: await response.blob(), fileName }
}
