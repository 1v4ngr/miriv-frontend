import { apiRequest } from '../../../services/api-client'

export interface AdminCenter { code: string; name: string }
export interface AdminUser { username: string; displayName: string; email: string; primaryCenterCode?: string; centers: AdminCenter[] }
export interface CreateAdminUserInput {
  username: string
  email: string
  firstName: string
  lastName?: string
  jobTitle?: string
  password: string
  centerCodes: string[]
}

export const adminUsersApi = {
  list() { return apiRequest<AdminUser[]>('/api/admin/users') },
  create(input: CreateAdminUserInput) {
    return apiRequest<AdminUser>('/api/admin/users', { method: 'POST', body: JSON.stringify(input) })
  },
  updateCenters(username: string, centerCodes: string[]) {
    return apiRequest<AdminUser>(`/api/admin/users/${encodeURIComponent(username)}/centers`, { method: 'PUT', body: JSON.stringify({ centerCodes }) })
  },
}
