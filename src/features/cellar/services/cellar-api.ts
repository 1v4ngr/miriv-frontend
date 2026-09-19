import type { Deposit, Lot, MovementResult, NewDeposit, NewEntry, NewLot, NewMovement } from '../types'
import { apiRequest } from '../../../services/api-client'

export interface CleaningAction {
  action: string
  result: string
  notes?: string
  approved: boolean
}

export interface CellarApi {
  getDeposits(): Promise<Deposit[]>
  getDeposit(code: string): Promise<Deposit | undefined>
  createDeposit(input: NewDeposit): Promise<Deposit>
  updateDeposit(code: string, input: Pick<NewDeposit, 'zone' | 'position' | 'capacityLiters' | 'material' | 'refrigerated'>): Promise<Deposit>
  getLots(): Promise<Lot[]>
  getLot(code: string): Promise<Lot | undefined>
  updateLot(code: string, input: Pick<Lot, 'destination' | 'responsible' | 'origin' | 'varieties'>): Promise<Lot>
  createLot(input: NewLot, entry?: NewEntry): Promise<Lot>
  archiveLot(code: string, reason: string): Promise<Lot>
  reopenLot(code: string, reason: string): Promise<Lot>
  registerMovement(input: NewMovement): Promise<MovementResult>
  clearContent(code: string, reason: string, responsible: string): Promise<void>
  startCleaning(code: string): Promise<Deposit>
  completeCleaning(code: string, input: CleaningAction): Promise<Deposit>
}

export const cellarApi: CellarApi = {
  getDeposits() { return apiRequest<Deposit[]>('/api/deposits') },
  async getDeposit(code) { try { return await apiRequest<Deposit>(`/api/deposits/${encodeURIComponent(code)}`) } catch (error) { if ((error as { status?: number }).status === 404) return undefined; throw error } },
  createDeposit(input) { return apiRequest<Deposit>('/api/deposits', { method: 'POST', body: JSON.stringify(input) }) },
  updateDeposit(code, input) { return apiRequest<Deposit>(`/api/deposits/${encodeURIComponent(code)}`, { method: 'PATCH', body: JSON.stringify(input) }) },
  getLots() { return apiRequest<Lot[]>('/api/lots') },
  async getLot(code) { try { return await apiRequest<Lot>(`/api/lots/${encodeURIComponent(code)}`) } catch (error) { if ((error as { status?: number }).status === 404) return undefined; throw error } },
  updateLot(code, input) { return apiRequest<Lot>(`/api/lots/${encodeURIComponent(code)}`, { method: 'PATCH', body: JSON.stringify(input) }) },
  createLot(input, entry) { return apiRequest<Lot>('/api/lots', { method: 'POST', body: JSON.stringify({ lot: input, entry: entry ?? null }) }) },
  executeMovement(code: string) { return apiRequest<MovementResult>(`/api/movements/${encodeURIComponent(code)}/execute`, { method: 'POST' }) },
  registerMovement(input) { return apiRequest<MovementResult>('/api/movements', { method: 'POST', body: JSON.stringify(input) }) },
  clearContent(code: string, reason: string, responsible: string) {
    return apiRequest<void>(`/api/movements/deposits/${encodeURIComponent(code)}/content-clearance`, {
      method: 'POST',
      body: JSON.stringify({ reason, responsible }),
    })
  },
  startCleaning(code) {
    return apiRequest<Deposit>(`/api/deposits/${encodeURIComponent(code)}/cleaning/start`, { method: 'POST' })
  },
  completeCleaning(code, input) {
    return apiRequest<Deposit>(`/api/deposits/${encodeURIComponent(code)}/cleaning/complete`, {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  archiveLot(code: string, reason: string) {
    return apiRequest<Lot>(`/api/lots/${encodeURIComponent(code)}/archive`, { method: 'POST', body: JSON.stringify({ reason }) })
  },
  reopenLot(code: string, reason: string) {
    return apiRequest<Lot>(`/api/lots/${encodeURIComponent(code)}/reopen`, { method: 'POST', body: JSON.stringify({ reason }) })
  },
}
