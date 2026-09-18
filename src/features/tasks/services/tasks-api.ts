import type { Task } from '../types'
import { apiRequest } from '../../../services/api-client'
import { formatDateTime, localDateTimeToIso } from '../../../lib/format'

interface BackendTask {
  code: string
  title: string
  depositCode?: string
  contentCode?: string
  responsible?: string
  responsibleUsername?: string
  dueAt: string
  priority: string
  status: string
  completionCriterion?: string
  description?: string
  samplePoint?: string
  sampleCode?: string
  executedAt?: string
  result?: string
  observations?: string
}

function mapTask(item: BackendTask): Task {
  const dueAt = new Date(item.dueAt)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const closed = item.status === 'DONE' || item.status === 'CANCELLED'
  const group: Task['group'] = closed ? 'closed' : Number.isNaN(dueAt.getTime()) ? 'unscheduled' : dueAt < today ? 'overdue' : dueAt.toDateString() === today.toDateString() ? 'today' : 'upcoming'
  const priority = item.priority === 'HIGH' ? 'Alta' : item.priority === 'LOW' ? 'Baja' : item.priority === 'MEDIUM' ? 'Media' : 'Sin prioridad'
  return {
    id: item.code, title: item.title, depositCode: item.depositCode, contentCode: item.contentCode,
    responsible: item.responsible, responsibleUsername: item.responsibleUsername, priority, group, status: item.status as Task['status'],
    dueLabel: formatDateTime(item.dueAt), dueAt: item.dueAt,
    detail: item.description ?? item.completionCriterion ?? '', completionCriterion: item.completionCriterion, description: item.description,
    execution: item.executedAt ? { executedAt: item.executedAt, result: item.result ?? '', samplePoint: item.samplePoint, sampleCode: item.sampleCode, notes: item.observations ?? '' } : undefined,
    history: [],
  }
}

export interface CreateTaskInput {
  title: string
  priority: Task['priority']
  dueAt: string
  depositCode: string
  contentCode?: string
  responsible: string
  description?: string
  requiresValidatedAnalysis: boolean
}

export interface CompleteTaskInput {
  executedAt: string
  result: string
  samplePoint?: string
  sampleCode?: string
  observations?: string
}

const PRIORITY_TO_BACKEND: Record<Task['priority'], string> = {
  Alta: 'HIGH', Media: 'MEDIUM', Baja: 'LOW', 'Sin prioridad': 'NONE',
}

export const tasksApi = {
  async getAll() { return (await apiRequest<BackendTask[]>('/api/tasks')).map(mapTask) },
  async getById(id: string) { try { return mapTask(await apiRequest<BackendTask>(`/api/tasks/${encodeURIComponent(id)}`)) } catch (error) { if ((error as { status?: number }).status === 404) return undefined; throw error } },
  async start(id: string) { return mapTask(await apiRequest<BackendTask>(`/api/tasks/${encodeURIComponent(id)}/start`, { method: 'POST' })) },
  async cancel(id: string, reason: string) { return mapTask(await apiRequest<BackendTask>(`/api/tasks/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) })) },
  async execute(id: string, input: CompleteTaskInput) {
    await apiRequest(`/api/tasks/${encodeURIComponent(id)}/complete`, { method: 'POST', body: JSON.stringify({ result: input.result, observations: input.observations, sampleCode: input.sampleCode, executedAt: input.executedAt ? localDateTimeToIso(input.executedAt) : null, samplePoint: input.samplePoint || null }) })
    return mapTask(await apiRequest<BackendTask>(`/api/tasks/${encodeURIComponent(id)}`))
  },
  async create(input: CreateTaskInput) {
    const response = await apiRequest<BackendTask>('/api/tasks', { method: 'POST', body: JSON.stringify({ title: input.title, depositCode: input.depositCode, contentCode: input.contentCode, responsible: input.responsible, dueAt: localDateTimeToIso(input.dueAt), priority: PRIORITY_TO_BACKEND[input.priority], completionCriterion: input.requiresValidatedAnalysis ? 'ANALYSIS_REQUIRED' : undefined, description: input.description }) })
    return mapTask(response)
  },
}