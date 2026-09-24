export interface DashboardMetric {
  label: string
  value: string
  detail: string
  tone: 'default' | 'warning' | 'error' | 'unavailable'
}

export interface RecentActivity {
  time: string
  content: string
  /** Structured form of the movement, to write it in words. */
  at: string
  type: string
  code: string
  source: string | null
  destination: string | null
  liters: number | null
  lot: string | null
}

export interface DayCount { date: string; count: number }

export interface WorkHomeData {
  center: string
  campaign: string
  updatedAt: string
  metrics: DashboardMetric[]
  recentActivity: RecentActivity[]
  /** Samples taken per day, last 30 days, oldest first, zero-filled. */
  samplesPerDay: DayCount[]
}