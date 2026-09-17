import { initialIncidents } from '../data/mock-incidents'
import type { Incident, IncidentResolution } from '../types'
import { apiRequest } from '../../../services/api-client'

let incidents = initialIncidents.map((incident) => ({ ...incident, evidence: [...incident.evidence], history: [...incident.history] }))

const wait = () => new Promise<void>((resolve) => window.setTimeout(resolve, 120))

const mockIncidentsApi = {
  async getAll() { await wait(); return incidents.map((incident) => ({ ...incident, evidence: [...incident.evidence], history: [...incident.history] })) },
  async getById(id: string) { await wait(); return incidents.find((incident) => incident.id === id) },
  async assign(id: string, responsible: string) {
    await wait()
    incidents = incidents.map((incident) => incident.id === id ? { ...incident, responsible, history: [{ date: 'Ahora', note: `Asignada a ${responsible}` }, ...incident.history] } : incident)
  },
  async toggleSilenced(id: string) {
    await wait()
    incidents = incidents.map((incident) => incident.id === id ? { ...incident, silencedUntil: incident.silencedUntil ? undefined : '20 sep 2026', history: [{ date: 'Ahora', note: incident.silencedUntil ? 'Silenciamiento retirado' : 'Silenciada hasta 20 sep 2026' }, ...incident.history] } : incident)
  },
  async resolve(id: string, resolution: IncidentResolution, reason: string) {
    await wait()
    if (!reason.trim()) throw new Error('Indica el motivo y la evidencia de la decisión.')
    incidents = incidents.map((incident) => incident.id === id ? { ...incident, status: 'closed', resolution, resolutionReason: reason.trim(), history: [{ date: 'Ahora', note: `${resolution}: ${reason.trim()}` }, ...incident.history] } : incident)
  },
}

interface BackendIncident {
  code: string
  title: string
  depositCode: string
  contentCode: string
  priority: string
  status: string
  responsible?: string
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
    lotCode: '', priority, status, responsible: item.responsible, silencedUntil: item.silencedUntil,
    openedAgo: item.openedAt, detectedAt: item.openedAt, lastEvidence: item.evidence.at(-1) ?? 'Sin evidencias',
    reasonDetail: '', evidence: item.evidence.map((value) => ({ date: item.openedAt, value, method: '', source: 'API' })),
    history: item.events.map((event) => ({ date: event.createdAt, note: event.note })),
    resolution: item.resolution === 'DISCARDED' ? 'Descartada' : item.resolution === 'RESOLVED' ? 'Resuelta' : undefined,
    resolutionReason: item.resolutionReason,
  }
}

const realIncidentsApi = {
  async getAll() { return (await apiRequest<BackendIncident[]>('/api/incidents')).map(mapIncident) },
  async getById(id: string) { try { return mapIncident(await apiRequest<BackendIncident>(`/api/incidents/${encodeURIComponent(id)}`)) } catch (error) { if ((error as { status?: number }).status === 404) return undefined; throw error } },
  async assign(id: string, responsible: string) { await apiRequest(`/api/incidents/${encodeURIComponent(id)}/assign`, { method: 'POST', body: JSON.stringify({ responsible }) }) },
  async toggleSilenced(id: string) { await apiRequest(`/api/incidents/${encodeURIComponent(id)}/silence`, { method: 'POST', body: JSON.stringify({ until: new Date(Date.now() + 86_400_000).toISOString(), reason: 'Temporarily silenced from the user interface.' }) }) },
  async resolve(id: string, resolution: IncidentResolution, reason: string) {
    const endpoint = resolution === 'Descartada' ? 'discard' : 'resolve'
    await apiRequest(`/api/incidents/${encodeURIComponent(id)}/${endpoint}`, { method: 'POST', body: JSON.stringify({ reason, ...(resolution === 'Descartada' ? { discardCategory: 'FALSE_POSITIVE' } : {}) }) })
  },
}

export const incidentsApi = import.meta.env.VITE_API_MODE === 'mock' ? mockIncidentsApi : realIncidentsApi
