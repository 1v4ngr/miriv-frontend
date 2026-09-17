import type { Deposit, Lot, Occupation } from '../types'
import { apiRequest } from '../../../services/api-client'

export interface LotUnit { code: string; depositCode: string; occupation: Occupation; active: boolean }
export interface LineageEvent { origin: string; destination: string; date: string; movement: string; volumeLiters: number; note: string }

export function getLotUnits(lot: Lot, deposits: Deposit[]): LotUnit[] {
  return deposits.flatMap((deposit) => deposit.occupations.filter((occupation) => occupation.lotCode === lot.code && lot.contentCodes.includes(occupation.contentCode)).map((occupation) => ({ code: occupation.contentCode, depositCode: deposit.code, occupation, active: !occupation.exitDate })))
}

function mockLotLineage(lot: Lot, units: LotUnit[]): LineageEvent[] {
  if (lot.code === 'L-2026-031') return units.map((unit) => ({ origin: 'C-2026-100', destination: unit.code, date: '9 sep 2026', movement: 'MOV-2026-0412', volumeLiters: unit.occupation.volumeLiters, note: 'División registrada' }))
  return units.map((unit) => ({ origin: `Entrada ${lot.code}`, destination: unit.code, date: lot.entryDate, movement: 'Entrada', volumeLiters: unit.occupation.volumeLiters, note: 'Entrada registrada' }))
}

export interface GenealogyApi { getEvents(lot: Lot, deposits: Deposit[]): Promise<LineageEvent[]> }
const mockGenealogyApi: GenealogyApi = { async getEvents(lot, deposits) { return mockLotLineage(lot, getLotUnits(lot, deposits)) } }
const realGenealogyApi: GenealogyApi = { getEvents(lot) { return apiRequest<LineageEvent[]>(`/api/lots/${encodeURIComponent(lot.code)}/genealogy`) } }
export const genealogyApi: GenealogyApi = import.meta.env.VITE_API_MODE === 'mock' ? mockGenealogyApi : realGenealogyApi
