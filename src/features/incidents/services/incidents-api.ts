import type { Incident, IncidentResolution } from '../types'
import { apiRequest } from '../../../services/api-client'

interface BackendIncident {
  code: string
  title: string
  depositCode: string
  contentCode: string
  priority: string
  status: string
  responsible?: string
  responsibleUsername?: string
  openedAt: string
  silencedUntil?: string
  resolution?: string
  resolutionReason?: string
  events: { note: string; createdAt: string }[]
  evidence: string[]
}

function mapIncident(item: BackendIncident): Incident {
  const priority = item.priority === 'URGENT' ? 'Crítica' : item.priority === 'HIGH' ? 'Alta' : 'Media'
  const status = item.status === 'RESOLVED' || item.status === 'DISCARDED' ? 'closed' : item.status === 'MONITORING' ? 'monitoring' : 'active'
  return {
    id: item.code, title: item.title, depositCode: item.depositCode, contentCode: item.contentCode,
    lotCode: '', priority, status, responsible: item.responsible, responsibleUsername: item.responsibleUsername,
    silencedUntil: item.silencedUntil,
    openedAgo: item.openedAt, detectedAt: item.openedAt, lastEvidence: item.evidence.at(-1) ?? 'Sin evidencias',
    reasonDetail: '', evidence: item.evidence.map((value) => ({ date: item.openedAt, value, method: '', source: 'API' })),
    history: item.events.map((event) => ({ date: event.createdAt, note: event.note })),
    resolution: item.resolution === 'DISCARDED' ? 'Descartada' : item.resolution === 'RESOLVED' ? 'Resuelta' : undefined,
    resolutionReason: item.resolutionReason,
  }
}

export const incidentsApi = {
  async getAll() { return (await apiRequest<BackendIncident[]>('/api/incidents')).map(mapIncident) },
  async getById(id: string) { try { return mapIncident(await apiRequest<BackendIncident>(`/api/incidents/${encodeURIComponent(id)}`)) } catch (error) { if ((error as { status?: number }).status === 404) return undefined; throw error } },
  async assign(id: string, responsible: string) { await apiRequest(`/api/incidents/${encodeURIComponent(id)}/assign`, { method: 'POST', body: JSON.stringify({ responsible }) }) },
  async toggleSilenced(id: string) { await apiRequest(`/api/incidents/${encodeURIComponent(id)}/silence`, { method: 'POST', body: JSON.stringify({ until: new Date(Date.now() + 86_400_000).toISOString(), reason: 'Temporarily silenced from the user interface.' }) }) },
  async resolve(id: string, resolution: IncidentResolution, reason: string) {
    const endpoint = resolution === 'Descartada' ? 'discard' : 'resolve'
    await apiRequest(`/api/incidents/${encodeURIComponent(id)}/${endpoint}`, { method: 'POST', body: JSON.stringify({ reason, ...(resolution === 'Descartada' ? { discardCategory: 'FALSE_POSITIVE' } : {}) }) })
  },
}
