import { apiRequest } from '../../../services/api-client'

export interface AdminCenter { code: string; name: string }
export interface AdminUser { username: string; displayName: string; email: string; primaryCenterCode?: string; centers: AdminCenter[] }

export const adminUsersApi = {
  list() { return apiRequest<AdminUser[]>('/api/admin/users') },
  updateCenters(username: string, centerCodes: string[]) {
    return apiRequest<AdminUser>(`/api/admin/users/${encodeURIComponent(username)}/centers`, { method: 'PUT', body: JSON.stringify({ centerCodes }) })
  },
}
