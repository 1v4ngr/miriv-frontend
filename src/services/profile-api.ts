import { apiRequest } from './api-client'

export interface CurrentUserProfile {
  username: string
  email: string
  firstName: string
  lastName: string
  displayName: string
  avatarUrl?: string
  jobTitle?: string
  centerCode: string
  centerName: string
  zones: string[]
}

const mockProfile: CurrentUserProfile = {
  username: 'm.solana', email: 'm.solana@miriv.coop', firstName: 'María', lastName: 'Solana',
  displayName: 'María Solana', jobTitle: 'Enóloga', centerCode: 'CENTRO-NORTE', centerName: 'Centro Norte', zones: ['Nave A', 'Nave B'],
}

export const profileApi = {
  getCurrentProfile() {
    return import.meta.env.VITE_API_MODE === 'mock'
      ? Promise.resolve(mockProfile)
      : apiRequest<CurrentUserProfile>('/api/account/me')
  },
}
