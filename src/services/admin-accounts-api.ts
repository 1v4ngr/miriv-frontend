import { apiRequest } from './api-client'

export interface RoleSummary { roleId: string; code: string; name: string; zoneId?: string; zoneCode?: string; zoneName?: string }
export interface PermissionGrantSummary { id: string; permissionCode: string; zoneId?: string; zoneCode?: string; grantedBy?: string; grantedByUsername?: string; reason: string; validFrom: string; validUntil?: string }
export interface CenterMembershipSummary { centerId: string; code: string; name: string }

export interface UserAccount {
  id: string
  username: string
  email: string
  firstName?: string
  lastName?: string
  displayName: string
  jobTitle?: string
  avatarUrl?: string
  active: boolean
  createdAt: string
  deactivatedAt?: string
  roles: RoleSummary[]
  grants: PermissionGrantSummary[]
  centers: CenterMembershipSummary[]
}

export interface RoleOption { code: string; name: string; description: string }
export interface PermissionOption { code: string; groupName: string; description: string; grantable: boolean }

export const adminAccountsApi = {
  list() { return apiRequest<UserAccount[]>('/api/admin/users/accounts') },
  get(id: string) { return apiRequest<UserAccount>(`/api/admin/users/accounts/${id}`) },
  assignRole(id: string, payload: { roleCode: string; zoneId?: string }) {
    return apiRequest<UserAccount>(`/api/admin/users/accounts/${id}/roles`, { method: 'POST', body: JSON.stringify(payload) })
  },
  revokeRole(id: string, roleAssignmentId: string) {
    return apiRequest<UserAccount>(`/api/admin/users/accounts/${id}/roles/${roleAssignmentId}`, { method: 'DELETE' })
  },
  grantPermission(id: string, payload: { permissionCode: string; zoneId?: string; reason: string; validFrom?: string; validUntil?: string }) {
    return apiRequest<UserAccount>(`/api/admin/users/accounts/${id}/grants`, { method: 'POST', body: JSON.stringify(payload) })
  },
  revokePermission(id: string, grantId: string) {
    return apiRequest<UserAccount>(`/api/admin/users/accounts/${id}/grants/${grantId}`, { method: 'DELETE' })
  },
  deactivate(id: string, reason: string) {
    return apiRequest<UserAccount>(`/api/admin/users/accounts/${id}/deactivate`, { method: 'POST', body: JSON.stringify({ reason }) })
  },
  reactivate(id: string, reason: string) {
    return apiRequest<UserAccount>(`/api/admin/users/accounts/${id}/reactivate`, { method: 'POST', body: JSON.stringify({ reason }) })
  },
  listRoles() { return apiRequest<RoleOption[]>('/api/admin/roles') },
  listPermissions() { return apiRequest<PermissionOption[]>('/api/admin/permissions') },
}