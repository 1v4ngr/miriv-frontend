const PERSISTENT_TOKEN_KEY = 'miriv.access-token'
const SESSION_TOKEN_KEY = 'miriv.session-token'
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')

export class ApiRequestError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiRequestError'
    this.status = status
  }
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

export function clearAccessToken(): void {
  localStorage.removeItem(PERSISTENT_TOKEN_KEY)
  sessionStorage.removeItem(SESSION_TOKEN_KEY)
}

export function hasActiveSession(): boolean {
  return Boolean(getAccessToken())
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  const token = getAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')

  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers })
  if (response.status === 401) {
    clearAccessToken()
    window.dispatchEvent(new Event('miriv:session-expired'))
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => undefined) as { message?: string } | undefined
    throw new ApiRequestError(response.status, payload?.message ?? 'The request could not be completed.')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
