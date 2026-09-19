import { apiRequest } from '../../../services/api-client'
export interface AdminCenter { code: string; name: string }
/** What deleting a center would remove (see CenterPurgeService). */
export interface CenterImpact {
  code: string
  counts: Record<string, number>
  usersDeleted: string[]
  /** Super administrators are never removed: they move to `fallbackCenter` (null when this is the last center). */
  superAdminsMoved: string[]
  fallbackCenter: string | null
  canPurge: boolean
}
const base = (code: string) => `/api/admin/centers/${encodeURIComponent(code)}`
export const adminCentersApi = {
  list: () => apiRequest<AdminCenter[]>('/api/admin/centers'),
  create: (input: AdminCenter) => apiRequest<AdminCenter>('/api/admin/centers', { method: 'POST', body: JSON.stringify(input) }),
  update: (code: string, input: AdminCenter) => apiRequest<AdminCenter>(base(code), { method: 'PUT', body: JSON.stringify(input) }),
  impact: (code: string) => apiRequest<CenterImpact>(`${base(code)}/impact`),
  remove: (code: string) => apiRequest<void>(base(code), { method: 'DELETE' }),
  /** Irreversible: deletes the center with everything in it. `confirm` must be the center code. */
  purge: (code: string, confirm: string) =>
    apiRequest<void>(`${base(code)}?cascade=true&confirm=${encodeURIComponent(confirm)}`, { method: 'DELETE' }),
}
