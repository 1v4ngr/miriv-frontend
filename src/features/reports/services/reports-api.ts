import { apiDownload, apiRequest } from '../../../services/api-client'

export type ReportPeriod = 'DEPOSIT_ENTRY' | 'CONTENT_START' | 'RANGE'

/** Empty lists mean "all". from / to (YYYY-MM-DD) only apply to RANGE. */
export interface ReportFilters {
  zones: string[]
  deposits: string[]
  phases: string[]
  categories: string[]
  period: ReportPeriod
  from: string | null
  to: string | null
}

export type ReportStatus = 'PREPARING' | 'AVAILABLE' | 'FAILED'

export interface ReportJob {
  code: string
  type: string
  title: string
  filters: Partial<ReportFilters>
  /** Human description of the filters. */
  scope: string
  includeProvisional: boolean
  status: ReportStatus
  error: string | null
  recordCount: number | null
  depositCount: number | null
  author: string
  createdAt: string
  finishedAt: string | null
  pdf: boolean
  xlsx: boolean
}

export interface ReportPage { items: ReportJob[]; total: number; page: number; size: number }

export interface ReportOption { code: string; name: string }
/** content / phase are null for an empty deposit; phase NONE = no configured phase matches. */
export interface ReportDepositOption { code: string; name: string | null; zone: string | null; content: string | null; category: string | null; phase: string | null }

/** A report phase. Empty criteria lists mean "any"; NONE in a state list = no state recorded. */
export interface ReportPhase {
  id: string
  code: string
  name: string
  description: string | null
  color: string
  position: number
  active: boolean
  categoryCodes: string[]
  alcoholicStates: string[]
  malolacticStates: string[]
  parameterCodes: string[]
}

export type ReportPhaseInput = Omit<ReportPhase, 'id' | 'position' | 'code'> & { code?: string | null }

export interface ReportOptions { zones: ReportOption[]; deposits: ReportDepositOption[]; categories: ReportOption[]; phases: ReportPhase[] }

export interface CreateReportInput { type: 'CELLAR_STATUS'; title?: string; filters: ReportFilters; includeProvisional: boolean }

export const reportsApi = {
  options() { return apiRequest<ReportOptions>('/api/reports/options') },
  list(page = 0, size = 20) { return apiRequest<ReportPage>(`/api/reports?page=${page}&size=${size}`) },
  create(input: CreateReportInput) { return apiRequest<ReportJob>('/api/reports', { method: 'POST', body: JSON.stringify(input) }) },
  file(code: string, format: 'pdf' | 'xlsx') { return apiDownload(`/api/reports/${encodeURIComponent(code)}/file?format=${format}`) },
  phases() { return apiRequest<ReportPhase[]>('/api/report-phases') },
  createPhase(input: ReportPhaseInput) { return apiRequest<ReportPhase>('/api/admin/report-phases', { method: 'POST', body: JSON.stringify(input) }) },
  updatePhase(id: string, input: ReportPhaseInput) { return apiRequest<ReportPhase>(`/api/admin/report-phases/${id}`, { method: 'PUT', body: JSON.stringify(input) }) },
  deletePhase(id: string) { return apiRequest<void>(`/api/admin/report-phases/${id}`, { method: 'DELETE' }) },
  reorderPhases(ids: string[]) { return apiRequest<ReportPhase[]>('/api/admin/report-phases/order', { method: 'PUT', body: JSON.stringify({ ids }) }) },
}

/** Saves a downloaded blob with its name. */
export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
