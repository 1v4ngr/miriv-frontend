import { initialTasks } from '../data/mock-tasks'
import type { Task } from '../types'
import { apiRequest } from '../../../services/api-client'

let tasks = initialTasks.map((task) => ({ ...task, history: [...task.history] }))
const wait = () => new Promise<void>((resolve) => window.setTimeout(resolve, 100))
const mockTasksApi = {
  async getAll() { await wait(); return tasks.map((task) => ({ ...task, history: [...task.history] })) },
  async getById(id: string) { await wait(); return tasks.find((task) => task.id === id) },
  async execute(id: string, execution: NonNullable<Task['execution']>) { await wait(); tasks = tasks.map((task) => task.id === id ? { ...task, execution, history: [{ date: 'Ahora', note: 'Toma registrada; pendiente de validación de laboratorio.' }, ...task.history] } : task) },
  async create(input: Pick<Task, 'title' | 'priority' | 'dueLabel' | 'depositCode' | 'contentCode' | 'detail'>) { await wait(); const task: Task = { ...input, id: `TASK-2026-${String(80 + tasks.length).padStart(3, '0')}`, group: input.dueLabel === 'Sin fecha' ? 'unscheduled' : 'today', responsible: 'María Solana', history: [{ date: 'Ahora', note: 'Tarea creada manualmente' }] }; tasks = [task, ...tasks]; return task },
}

interface BackendTask {
  code: string
  title: string
  depositCode?: string
  contentCode?: string
  responsible?: string
  dueAt: string
  priority: string
  status: string
  completionCriterion?: string
  executedAt?: string
  result?: string
  observations?: string
}

function mapTask(item: BackendTask): Task {
  const dueAt = new Date(item.dueAt)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const group = Number.isNaN(dueAt.getTime()) ? 'unscheduled' : dueAt < today ? 'overdue' : dueAt.toDateString() === today.toDateString() ? 'today' : 'upcoming'
  const priority = item.priority === 'HIGH' ? 'Alta' : item.priority === 'LOW' ? 'Baja' : item.priority === 'MEDIUM' ? 'Media' : 'Sin prioridad'
  return {
    id: item.code, title: item.title, depositCode: item.depositCode, contentCode: item.contentCode,
    responsible: item.responsible, priority, group, dueLabel: item.dueAt,
    detail: item.completionCriterion ?? '', completionCriterion: item.completionCriterion,
    execution: item.executedAt ? { executedAt: item.executedAt, samplePoint: '', notes: item.observations ?? item.result ?? '' } : undefined,
    history: [],
  }
}

const realTasksApi = {
  async getAll() { return (await apiRequest<BackendTask[]>('/api/tasks')).map(mapTask) },
  async getById(id: string) { try { return mapTask(await apiRequest<BackendTask>(`/api/tasks/${encodeURIComponent(id)}`)) } catch (error) { if ((error as { status?: number }).status === 404) return undefined; throw error } },
  async execute(id: string, execution: NonNullable<Task['execution']>) {
    await apiRequest(`/api/tasks/${encodeURIComponent(id)}/complete`, { method: 'POST', body: JSON.stringify({ result: 'Completed from the work queue.', observations: execution.notes, sampleCode: execution.samplePoint || undefined }) })
  },
  async create(input: Pick<Task, 'title' | 'priority' | 'dueLabel' | 'depositCode' | 'contentCode' | 'detail'>) {
    const dueAt = input.dueLabel === 'Sin fecha' ? new Date(Date.now() + 86_400_000) : new Date(input.dueLabel)
    const response = await apiRequest<BackendTask>('/api/tasks', { method: 'POST', body: JSON.stringify({ title: input.title, depositCode: input.depositCode, contentCode: input.contentCode, responsible: 'María Solana', dueAt: Number.isNaN(dueAt.getTime()) ? new Date(Date.now() + 86_400_000).toISOString() : dueAt.toISOString(), priority: input.priority === 'Alta' ? 'HIGH' : input.priority === 'Baja' ? 'LOW' : 'MEDIUM', completionCriterion: input.detail }) })
    return mapTask(response)
  },
}

export const tasksApi = import.meta.env.VITE_API_MODE === 'mock' ? mockTasksApi : realTasksApi
