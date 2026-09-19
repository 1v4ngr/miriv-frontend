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
  categoryCode: string | null
  phase: string | null
  warnMin: number | null
  warnMax: number | null
  critMin: number | null
  critMax: number | null
  note: string | null
}

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
  listTargets() { return apiRequest<TargetView[]>('/api/admin/parameter-targets') },
  createTarget(input: TargetInput) { return apiRequest<TargetView>('/api/admin/parameter-targets', { method: 'POST', body: JSON.stringify(input) }) },
  updateTarget(id: string, input: TargetInput) { return apiRequest<TargetView>(`/api/admin/parameter-targets/${id}`, { method: 'PUT', body: JSON.stringify(input) }) },
  deleteTarget(id: string) { return apiRequest<void>(`/api/admin/parameter-targets/${id}`, { method: 'DELETE' }) },
}
