import { apiRequest } from '../../../services/api-client'
import type { Deposit, Lot, Occupation } from '../types'
import type { Sample } from '../../laboratory/types'

export interface ContentRecord {
  code: string
  lot: Lot | undefined
  deposit: Deposit
  occupation: Occupation
  active: boolean
  // F2-03: plan can be null when the content does not yet have an elaboration plan.
  plan: string | null
  alcoholic: { estimate: string | null; confirmation: string | null; date: string | null }
  malolactic: { estimate: string | null; confirmation: string | null; intention: string | null; date: string | null }
  samples: Sample[]
}

export interface ReviewStateInput {
  process: 'alcoholic' | 'malolactic'
  decision: string
  reason: string
  /** Only when closing the alcoholic fermentation: the category the must becomes (Tinto, Blanco…). */
  newCategory?: string
}
export interface ContentApi {
  getContent(code: string): Promise<ContentRecord | undefined>
  reviewState(code: string, input: ReviewStateInput): Promise<void>
}

export const contentApi: ContentApi = {
  async getContent(code) { try { return await apiRequest<ContentRecord>(`/api/contents/${encodeURIComponent(code)}`) } catch (error) { if ((error as { status?: number }).status === 404) return undefined; throw error } },
  async reviewState(code, input) { await apiRequest<void>(`/api/contents/${encodeURIComponent(code)}/state-reviews`, { method: 'POST', body: JSON.stringify(input) }) },
}