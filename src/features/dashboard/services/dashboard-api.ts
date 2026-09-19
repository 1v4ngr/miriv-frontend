import { apiRequest } from '../../../services/api-client'
import { normalizeDashboard } from '../schema'
import { DASHBOARD_SCHEMA_VERSION, type Dashboard, type DashboardSummary } from '../types'

const base = '/api/account/dashboards'

export const dashboardApi = {
  list: () => apiRequest<DashboardSummary[]>(base),
  get: async (id: string) => normalizeDashboard(await apiRequest<unknown>(`${base}/${id}`)),
  create: (name: string, body?: Pick<Dashboard, 'layouts' | 'widgets'>) =>
    apiRequest<unknown>(base, { method: 'POST', body: JSON.stringify({ name, schemaVersion: DASHBOARD_SCHEMA_VERSION, ...body }) }).then(normalizeDashboard),
  save: (dashboard: Dashboard) =>
    apiRequest<unknown>(`${base}/${dashboard.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: dashboard.name, schemaVersion: dashboard.schemaVersion, layouts: dashboard.layouts, widgets: dashboard.widgets, version: dashboard.version }),
    }).then(normalizeDashboard),
  duplicate: (id: string) => apiRequest<unknown>(`${base}/${id}/duplicate`, { method: 'POST' }).then(normalizeDashboard),
  makeDefault: (id: string) => apiRequest<unknown>(`${base}/${id}/default`, { method: 'POST' }).then(normalizeDashboard),
  remove: (id: string) => apiRequest<void>(`${base}/${id}`, { method: 'DELETE' }),
}
