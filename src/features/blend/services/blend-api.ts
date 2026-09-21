import { apiRequest } from '../../../services/api-client'
import type { Addition } from '../types'
import type { Goal, Target } from '../solver'

export interface BlendPayload {
  components: Array<{ contentCode: string; depositCode: string; volumeLiters: number }>
  additions: Addition[]
  targets: Target[]
  goal: Goal
  totalMin: number | null
  totalMax: number | null
}

export interface BlendSummary { id: string; name: string; status: 'DRAFT' | 'CONVERTED'; destinationDepositCode: string | null; author: string | null; updatedAt: string }
export interface BlendView extends BlendSummary {
  payload: BlendPayload
  result: unknown
  version: number
  plannedMovements: string[]
}
export interface BlendInput { name: string; destinationDepositCode: string | null; payload: BlendPayload; result?: unknown; version?: number }

const base = '/api/blends'

export const blendApi = {
  list: () => apiRequest<BlendSummary[]>(base),
  get: (id: string) => apiRequest<BlendView>(`${base}/${id}`),
  create: (input: BlendInput) => apiRequest<BlendView>(base, { method: 'POST', body: JSON.stringify(input) }),
  save: (id: string, input: BlendInput) => apiRequest<BlendView>(`${base}/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  duplicate: (id: string) => apiRequest<BlendView>(`${base}/${id}/duplicate`, { method: 'POST' }),
  remove: (id: string) => apiRequest<void>(`${base}/${id}`, { method: 'DELETE' }),
}