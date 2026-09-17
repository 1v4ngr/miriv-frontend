import { cellarApi } from './cellar-api'
import { laboratoryApi } from '../../laboratory/services/laboratory-api'
import { apiRequest } from '../../../services/api-client'
import type { Deposit, Lot, Occupation } from '../types'
import type { Sample } from '../../laboratory/types'

export interface ContentRecord {
  code: string
  lot: Lot | undefined
  deposit: Deposit
  occupation: Occupation
  active: boolean
  plan: string
  alcoholic: { estimate: string; confirmation: string; date: string }
  malolactic: { estimate: string; confirmation: string; intention: string; date: string }
  samples: Sample[]
}

export interface ReviewStateInput { process: 'alcoholic' | 'malolactic'; decision: string; reason: string }
export interface ContentApi {
  getContent(code: string): Promise<ContentRecord | undefined>
  reviewState(code: string, input: ReviewStateInput): Promise<void>
}

const reviews = new Map<string, Partial<Record<ReviewStateInput['process'], string>>>()

const mockContentApi: ContentApi = {
  async getContent(code) {
    const [deposits, lots, samples] = await Promise.all([cellarApi.getDeposits(), cellarApi.getLots(), laboratoryApi.getSamples()])
    const deposit = deposits.find((item) => item.occupations.some((occupation) => occupation.contentCode === code))
    const occupation = deposit?.occupations.find((item) => item.contentCode === code)
    if (!deposit || !occupation) return undefined
    const lot = lots.find((item) => item.code === occupation.lotCode)
    const confirmed = reviews.get(code)
    return {
      code, lot, deposit, occupation, active: !occupation.exitDate,
      plan: code === 'C-2026-114' ? 'Tinto crianza 2026' : lot?.destination ?? 'Sin plan asignado',
      alcoholic: { estimate: occupation.alcoholicState, confirmation: confirmed?.alcoholic ?? 'Sin confirmar', date: deposit.lastControl ?? 'Sin control reciente' },
      malolactic: { estimate: occupation.malolacticState, confirmation: confirmed?.malolactic ?? 'Sin confirmar', intention: occupation.malolacticState.toLowerCase().includes('prevista') ? 'Prevista en plan' : 'No prevista en plan', date: deposit.lastControl ?? 'Sin control reciente' },
      samples: samples.filter((sample) => sample.contentCode === code),
    }
  },
  async reviewState(code, input) {
    if (!input.reason.trim()) throw new Error('Indica el motivo de la decisión.')
    if (!input.decision.trim()) throw new Error('Selecciona un estado confirmado.')
    const content = await this.getContent(code)
    if (!content?.active) throw new Error('Solo se puede confirmar el estado de contenido activo.')
    reviews.set(code, { ...reviews.get(code), [input.process]: input.decision })
  },
}

const realContentApi: ContentApi = {
  async getContent(code) { try { return await apiRequest<ContentRecord>(`/api/contents/${encodeURIComponent(code)}`) } catch (error) { if ((error as { status?: number }).status === 404) return undefined; throw error } },
  async reviewState(code, input) { await apiRequest<void>(`/api/contents/${encodeURIComponent(code)}/state-reviews`, { method: 'POST', body: JSON.stringify(input) }) },
}
export const contentApi: ContentApi = import.meta.env.VITE_API_MODE === 'mock' ? mockContentApi : realContentApi
