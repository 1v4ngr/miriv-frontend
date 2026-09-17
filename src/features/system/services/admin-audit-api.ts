import { apiRequest } from '../../../services/api-client'
export interface AuditEntry { entityName: string; action: string; author: string; reason?: string; createdAt: string }
export const adminAuditApi = { list() { return apiRequest<AuditEntry[]>('/api/admin/audit') } }
