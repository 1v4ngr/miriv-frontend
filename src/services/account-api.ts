import { apiRequest } from './api-client'

export interface RoleSummary { code: string; name: string; zones: string[] }
export interface PermissionSummary { code: string; allZones: boolean; zones: string[] }
export interface ReadScope { allZones: boolean; zones: string[] }

export interface AccountSummary {
  username: string
  email: string
  displayName: string
  firstName: string
  lastName: string
  avatarUrl?: string
  jobTitle?: string
  centerCode: string
  centerName: string
  roles: RoleSummary[]
  permissions: PermissionSummary[]
  zones: string[]
  readScope: ReadScope
}

export const accountApi = {
  getAccount() {
    return apiRequest<AccountSummary>('/api/account/me')
  },
}