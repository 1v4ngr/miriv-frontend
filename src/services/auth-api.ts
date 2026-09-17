export interface LoginRequest {
  username: string
  password: string
  rememberSession: boolean
}

export interface AuthUser {
  id: string
  name: string
  role: string
  center: string
}

export interface LoginResponse {
  ok: boolean
  message?: string
  attemptsRemaining?: number
  user?: AuthUser
}

interface BackendLoginResponse {
  accessToken: string
  expiresInSeconds: number
  userId: string
  fullName: string
  roles: string[]
}

export interface PasswordRecoveryRequest {
  usernameOrEmail: string
}

export interface PasswordRecoveryResponse {
  ok: boolean
  message: string
}

export interface AuthApi {
  login(request: LoginRequest): Promise<LoginResponse>
  requestPasswordReset(request: PasswordRecoveryRequest): Promise<PasswordRecoveryResponse>
}

const MOCK_PASSWORD = 'miriv2026'
const MOCK_LATENCY_MS = 650

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds))
}

const mockAuthApi: AuthApi = {
  async login({ username, password }) {
    await wait(MOCK_LATENCY_MS)

    if (username.trim().toLowerCase() === 'm.solana@miriv.coop' && password === MOCK_PASSWORD) {
      return {
        ok: true,
        user: {
          id: 'usr_maria_solana',
          name: 'María Solana',
          role: 'Enóloga',
          center: 'Centro Norte',
        },
      }
    }

    return {
      ok: false,
      message: 'Credenciales no aceptadas.',
      attemptsRemaining: 3,
    }
  },

  async requestPasswordReset({ usernameOrEmail }) {
    await wait(MOCK_LATENCY_MS)

    if (!usernameOrEmail.trim()) {
      return { ok: false, message: 'Introduce tu usuario o correo.' }
    }

    return {
      ok: true,
      message: 'Si existe una cuenta asociada, recibirás un correo con los siguientes pasos.',
    }
  },
}

const realAuthApi: AuthApi = {
  async login(request) {
    const response = await apiRequest<BackendLoginResponse>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: request.username, password: request.password }),
    })
    saveAccessToken(response.accessToken, request.rememberSession)
    return {
      ok: true,
      user: {
        id: response.userId,
        name: response.fullName,
        role: response.roles[0]?.replace('ROLE_', '') ?? 'USER',
        center: '',
      },
    }
  },

  async requestPasswordReset(request) {
    return apiRequest<PasswordRecoveryResponse>('/api/auth/password-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    })
  },
}

const useMockApi = import.meta.env.VITE_API_MODE === 'mock'

export const apiMode = useMockApi ? 'mock' : 'real'
export const authApi: AuthApi = useMockApi ? mockAuthApi : realAuthApi
import { apiRequest, saveAccessToken } from './api-client'
