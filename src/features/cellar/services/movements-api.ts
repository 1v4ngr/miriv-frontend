// F4-01: client for the movement history endpoints (UI14 list + UI15 receipt).
import { apiRequest } from '../../../services/api-client'
import type { PageResponse } from '../../../lib/types'
import type { MovementType, MovementStatus } from '../types'

export interface MovementSummary {
  code: string
  type: MovementType
  status: MovementStatus
  effectiveAt: string
  registeredAt: string
  sourceDeposits: string[]
  destinationDeposits: string[]
  lotCodes: string[]
  volumeLiters: number
  responsible: string
  registeredBy: string
}

export interface MovementLine {
  sourceDeposit: string
  sourceContent: string
  destinationDeposit: string
  destinationContent: string
  volumeLiters: number | null
  lossLiters: number | null
  sourceBefore: number | null
  sourceAfter: number | null
  destinationBefore: number | null
  destinationAfter: number | null
}

export interface MovementDetail {
  code: string
  type: MovementType
  status: MovementStatus
  effectiveAt: string
  registeredAt: string
  responsible: string
  registeredBy: string
  reason: string
  cancelledReason: string | null
  lines: MovementLine[]
}

export interface MovementFilters {
  from?: string
  to?: string
  deposit?: string
  lot?: string
  type?: MovementType
  status?: MovementStatus
  author?: string
  q?: string
  page?: number
  size?: number
}

function toParams(filters: MovementFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  return params
}

export const movementsApi = {
  list(filters: MovementFilters = {}) {
    const params = toParams(filters)
    const qs = params.toString()
    return apiRequest<PageResponse<MovementSummary>>(`/api/movements${qs ? `?${qs}` : ''}`)
  },
  get(code: string) {
    return apiRequest<MovementDetail>(`/api/movements/${encodeURIComponent(code)}`)
  },
  execute(code: string) {
    return apiRequest<{ code: string; status: MovementStatus }>(`/api/movements/${encodeURIComponent(code)}/execute`, { method: 'POST' })
  },
  /** Fixes when a movement happened; the occupations it opened or closed follow it. */
  reschedule(code: string, input: { effectiveDate: string; effectiveTime?: string; reason?: string }) {
    return apiRequest<void>(`/api/movements/${encodeURIComponent(code)}`, {
      method: 'PATCH', body: JSON.stringify(input),
    })
  },
  /** Deletes a movement and puts the wine back where it was (super administrator only). */
  undo(code: string, reason: string) {
    return apiRequest<void>(`/api/movements/${encodeURIComponent(code)}?reason=${encodeURIComponent(reason)}`, {
      method: 'DELETE',
    })
  },
  cancel(code: string, reason: string) {
    return apiRequest<void>(`/api/movements/${encodeURIComponent(code)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    })
  },
}