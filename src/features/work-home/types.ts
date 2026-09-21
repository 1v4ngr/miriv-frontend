export interface DashboardMetric {
  label: string
  value: string
  detail: string
  tone: 'default' | 'warning' | 'error' | 'unavailable'
}

export interface RecentActivity {
  time: string
  content: string
}

export interface WorkHomeData {
  center: string
  campaign: string
  updatedAt: string
  metrics: DashboardMetric[]
  recentActivity: RecentActivity[]
}