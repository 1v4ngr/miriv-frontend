export type AttentionPriority = 'critical' | 'overdue' | 'high'

export interface DashboardMetric {
  label: string
  value: string
  detail: string
  tone: 'default' | 'warning' | 'error' | 'unavailable'
}

export interface AttentionItem {
  id: string
  containerCode: string
  priority: AttentionPriority
  priorityLabel: string
  category: string
  lotCode: string
  title: string
  value?: string
  valueUnit?: string
  detail: string
  meta: string
  actionLabel: string
}

export interface RecentActivity {
  time: string
  content: string
}

export interface OwnTasks {
  status: 'available' | 'unavailable'
  count?: number
  detail: string
}

export interface WorkHomeData {
  center: string
  campaign: string
  updatedAt: string
  urgentCount: number
  attentionTotal: number
  metrics: DashboardMetric[]
  attentionItems: AttentionItem[]
  ownTasks: OwnTasks
  recentActivity: RecentActivity[]
}
