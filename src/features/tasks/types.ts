export type TaskPriority = 'Alta' | 'Media' | 'Baja' | 'Sin prioridad'
export type TaskGroup = 'overdue' | 'today' | 'upcoming' | 'unscheduled'

export interface Task {
  id: string
  title: string
  priority: TaskPriority
  group: TaskGroup
  dueLabel: string
  depositCode?: string
  contentCode?: string
  lotCode?: string
  detail: string
  responsible?: string
  origin?: string
  completionCriterion?: string
  history: { date: string; note: string }[]
  partial?: boolean
  execution?: { executedAt: string; samplePoint: string; notes: string }
}
