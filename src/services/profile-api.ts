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

export interface UpdateProfileRequest {
  firstName: string
  lastName?: string
  jobTitle?: string
  avatarUrl?: string
  centerCode?: string
}

export interface CenterOption {
  code: string
  name: string
}

export const profileApi = {
  getCurrentProfile() {
    return apiRequest<CurrentUserProfile>('/api/account/me')
  },

  updateProfile(request: UpdateProfileRequest) {
    return apiRequest<CurrentUserProfile>('/api/account/me', { method: 'PATCH', body: JSON.stringify(request) })
  },

  getCenters() {
    return apiRequest<CenterOption[]>('/api/account/centers')
  },
}
