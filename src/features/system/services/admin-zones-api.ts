import { apiRequest } from '../../../services/api-client'

export interface AdminZone {
  code: string
  name: string
  centerCode: string
  centerName: string
}

export interface AdminZoneInput {
  code: string
  name: string
  centerCode: string
}

export const adminZonesApi = {
  list() {
    return apiRequest<AdminZone[]>('/api/admin/zones')
  },
  create(input: AdminZoneInput) {
    return apiRequest<AdminZone>('/api/admin/zones', { method: 'POST', body: JSON.stringify(input) })
  },
  update(code: string, input: AdminZoneInput) {
    return apiRequest<AdminZone>(`/api/admin/zones/${encodeURIComponent(code)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    })
  },
  remove(code: string) {
    return apiRequest<void>(`/api/admin/zones/${encodeURIComponent(code)}`, { method: 'DELETE' })
  },
}
