export type TaskPriority = 'Alta' | 'Media' | 'Baja' | 'Sin prioridad'
export type TaskGroup = 'overdue' | 'today' | 'upcoming' | 'unscheduled' | 'closed'
export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED'

export interface TaskExecution {
  executedAt: string
  result: string
  samplePoint?: string
  sampleCode?: string
  notes: string
}

export interface Task {
  id: string
  title: string
  priority: TaskPriority
  group: TaskGroup
  dueLabel: string
  dueAt?: string
  status: TaskStatus
  depositCode?: string
  contentCode?: string
  lotCode?: string
  detail: string
  description?: string
  responsible?: string
  responsibleUsername?: string
  origin?: string
  completionCriterion?: string
  history: { date: string; note: string }[]
  partial?: boolean
  execution?: TaskExecution
}