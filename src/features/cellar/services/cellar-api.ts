import type { Deposit, Lot, MovementResult, NewDeposit, NewEntry, NewLot, NewMovement } from '../types'
import { apiRequest } from '../../../services/api-client'

export interface CellarApi {
  getDeposits(): Promise<Deposit[]>
  getDeposit(code: string): Promise<Deposit | undefined>
  createDeposit(input: NewDeposit): Promise<Deposit>
  updateDeposit(code: string, input: Pick<NewDeposit, 'zone' | 'position' | 'capacityLiters' | 'material' | 'refrigerated'>): Promise<Deposit>
  getLots(): Promise<Lot[]>
  getLot(code: string): Promise<Lot | undefined>
  updateLot(code: string, input: Pick<Lot, 'destination' | 'responsible' | 'origin' | 'variety'>): Promise<Lot>
  createLot(input: NewLot, entry?: NewEntry): Promise<Lot>
  registerMovement(input: NewMovement): Promise<MovementResult>
}

export const cellarApi: CellarApi = {
  getDeposits() { return apiRequest<Deposit[]>('/api/deposits') },
  async getDeposit(code) { try { return await apiRequest<Deposit>(`/api/deposits/${encodeURIComponent(code)}`) } catch (error) { if ((error as { status?: number }).status === 404) return undefined; throw error } },
  createDeposit(input) { return apiRequest<Deposit>('/api/deposits', { method: 'POST', body: JSON.stringify(input) }) },
  updateDeposit(code, input) { return apiRequest<Deposit>(`/api/deposits/${encodeURIComponent(code)}`, { method: 'PATCH', body: JSON.stringify(input) }) },
  getLots() { return apiRequest<Lot[]>('/api/lots') },
  async getLot(code) { try { return await apiRequest<Lot>(`/api/lots/${encodeURIComponent(code)}`) } catch (error) { if ((error as { status?: number }).status === 404) return undefined; throw error } },
  updateLot(code, input) { return apiRequest<Lot>(`/api/lots/${encodeURIComponent(code)}`, { method: 'PATCH', body: JSON.stringify(input) }) },
  createLot(input, entry) { return apiRequest<Lot>('/api/lots', { method: 'POST', body: JSON.stringify({ lot: input, entry }) }) },
  registerMovement(input) { return apiRequest<MovementResult>('/api/movements', { method: 'POST', body: JSON.stringify({ ...input, authorizeMixture: false }) }) },
}
