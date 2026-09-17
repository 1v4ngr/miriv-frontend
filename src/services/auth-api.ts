import { apiRequest, saveAccessToken } from './api-client'

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

export const authApi: AuthApi = {
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
