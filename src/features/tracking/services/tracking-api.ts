import { apiRequest } from '../../../services/api-client'

export interface ParameterInfo { code: string; name: string; unit: string | null; decimals: number }
export interface ContentInfo {
  code: string
  deposit: string | null
  lot: string
  category: string | null
  startedAt: string | null
  /** True for a parent content added by "include origin"; descendantCode is the requested content it flows into. */
  ancestor: boolean
  descendantCode: string | null
}
export type Qualifier = 'NONE' | 'LESS_THAN' | 'NOT_MEASURED' | 'NOT_DETECTED'
export interface SeriesPoint {
  content: string
  parameter: string
  takenAt: string
  value: number | null
  qualifier: Qualifier
  limit: number | null
  validated: boolean
  sampleCode: string
  method: string | null
}
export interface TargetRange { content: string; parameter: string; warnMin: number | null; warnMax: number | null; critMin: number | null; critMax: number | null }
export interface SeriesResponse { contents: ContentInfo[]; parameters: ParameterInfo[]; points: SeriesPoint[]; targets: TargetRange[] }

export interface TrackingEvent { content: string; at: string; type: 'TRANSFER' | 'ENTRY' | 'MIX' | 'SPLIT' | 'EXIT' | 'LOSS' | 'ADJUSTMENT' | 'OPERATION' | 'STATE_REVIEW'; label: string; detail: string }

export type Status = 'OK' | 'WARN' | 'CRIT' | 'UNKNOWN' | 'NONE'
export interface Reading { value: number | null; qualifier: Qualifier; limit: number | null; takenAt: string; sampleCode: string; daysAgo: number; status: Status }
export interface OverviewCell { parameter: string; latest: Reading | null; previous: Reading | null; trend: 'UP' | 'DOWN' | 'FLAT' | null }
export interface OverviewRow {
  content: string
  deposit: string
  depositName: string | null
  zone: string | null
  lot: string
  category: string | null
  volumeLiters: number | null
  alcoholicState: string | null
  malolacticState: string | null
  openSamples: number
  daysSinceLastSample: number | null
  openTasks: number
  nextTaskDueAt: string | null
  worstStatus: Status
  cells: OverviewCell[]
}
export interface OverviewResponse { parameters: ParameterInfo[]; rows: OverviewRow[] }

export interface TargetView {
  id: string
  /** Set when the range is fixed for one content only. */
  contentCode: string | null
  parameter: string
  parameterName: string
  unit: string | null
  categoryCode: string | null
  categoryName: string | null
  phase: string | null
  warnMin: number | null
  warnMax: number | null
  critMin: number | null
  critMax: number | null
  note: string | null
}
export interface TargetInput {
  parameter: string
  contentCode?: string | null
  categoryCode: string | null
  phase: string | null
  warnMin: number | null
  warnMax: number | null
  critMin: number | null
  critMax: number | null
  note: string | null
}

export interface LatestReading {
  parameter: string
  name: string
  unit: string | null
  decimals: number
  value: number | null
  qualifier: Qualifier
  limit: number | null
  takenAt: string
  daysAgo: number
  validated: boolean
  sampleCode: string
}
/** Latest reading of every parameter of one content, plus the volume and deposit capacity the blend simulator needs. */
export interface LatestContent {
  content: string
  deposit: string | null
  depositUsefulCapacityLiters: number | null
  lot: string
  categoryCode: string | null
  category: string | null
  volumeLiters: number | null
  alcoholicState: string | null
  readings: LatestReading[]
  /** Ranges that apply to this content (category / phase already resolved). */
  targets: TargetRange[]
}

export type AlertSeverity = 'INFO' | 'WARN' | 'CRIT'
export interface AlertCondition { parameter: string; type: 'LTE' | 'GTE' | 'STABLE'; value: number | null; days: number | null; tolerance: number | null }
export interface AlertRule {
  id: string
  name: string
  severity: AlertSeverity
  conditions: AlertCondition[]
  categoryCode: string | null
  categoryName: string | null
  contentCode: string | null
  phases: string[]
  active: boolean
}
export interface AlertRuleInput {
  name: string
  severity: AlertSeverity
  conditions: AlertCondition[]
  categoryCode: string | null
  contentCode: string | null
  phases: string[]
  active: boolean
}
export interface TrackingAlert { ruleId: string; rule: string; severity: AlertSeverity; content: string; deposit: string; category: string | null; since: string; sampleCode: string; detail: string }

export interface SeriesQuery { contents: string[]; parameters: string[]; from?: string; to?: string; includeAncestors?: boolean }

const list = (values: string[]) => encodeURIComponent(values.join(','))

export const trackingApi = {
  parameters(all = false) { return apiRequest<ParameterInfo[]>(`/api/tracking/parameters${all ? '?all=true' : ''}`) },
  series(query: SeriesQuery) {
    const params = [`contents=${list(query.contents)}`, `parameters=${list(query.parameters)}`]
    if (query.from) params.push(`from=${encodeURIComponent(query.from)}`)
    if (query.to) params.push(`to=${encodeURIComponent(query.to)}`)
    if (query.includeAncestors) params.push('includeAncestors=true')
    return apiRequest<SeriesResponse>(`/api/tracking/series?${params.join('&')}`)
  },
  events(contents: string[], from?: string, to?: string) {
    const params = [`contents=${list(contents)}`]
    if (from) params.push(`from=${encodeURIComponent(from)}`)
    if (to) params.push(`to=${encodeURIComponent(to)}`)
    return apiRequest<TrackingEvent[]>(`/api/tracking/events?${params.join('&')}`)
  },
  overview(parameters?: string[]) {
    return apiRequest<OverviewResponse>(`/api/tracking/overview${parameters?.length ? `?parameters=${list(parameters)}` : ''}`)
  },
  latest(contents: string[]) { return apiRequest<LatestContent[]>(`/api/tracking/latest?contents=${list(contents)}`) },
  alerts() { return apiRequest<TrackingAlert[]>('/api/tracking/alerts') },
  acknowledgeAlert(ruleId: string, content: string) { return apiRequest<void>(`/api/tracking/alerts/${ruleId}/contents/${encodeURIComponent(content)}/ack`, { method: 'POST' }) },
  alertRules() { return apiRequest<AlertRule[]>('/api/admin/alert-rules') },
  createAlertRule(input: AlertRuleInput) { return apiRequest<AlertRule>('/api/admin/alert-rules', { method: 'POST', body: JSON.stringify(input) }) },
  updateAlertRule(id: string, input: AlertRuleInput) { return apiRequest<AlertRule>(`/api/admin/alert-rules/${id}`, { method: 'PUT', body: JSON.stringify(input) }) },
  deleteAlertRule(id: string) { return apiRequest<void>(`/api/admin/alert-rules/${id}`, { method: 'DELETE' }) },
  contentAlertRules(content: string) { return apiRequest<AlertRule[]>(`/api/tracking/contents/${encodeURIComponent(content)}/alert-rules`) },
  contentTargets(content: string) { return apiRequest<TargetView[]>(`/api/tracking/contents/${encodeURIComponent(content)}/targets`) },
  saveContentTarget(content: string, input: TargetInput) { return apiRequest<TargetView>(`/api/tracking/contents/${encodeURIComponent(content)}/targets`, { method: 'PUT', body: JSON.stringify(input) }) },
  deleteContentTarget(content: string, id: string) { return apiRequest<void>(`/api/tracking/contents/${encodeURIComponent(content)}/targets/${id}`, { method: 'DELETE' }) },
  listTargets() { return apiRequest<TargetView[]>('/api/admin/parameter-targets') },
  createTarget(input: TargetInput) { return apiRequest<TargetView>('/api/admin/parameter-targets', { method: 'POST', body: JSON.stringify(input) }) },
  updateTarget(id: string, input: TargetInput) { return apiRequest<TargetView>(`/api/admin/parameter-targets/${id}`, { method: 'PUT', body: JSON.stringify(input) }) },
  deleteTarget(id: string) { return apiRequest<void>(`/api/admin/parameter-targets/${id}`, { method: 'DELETE' }) },
}
