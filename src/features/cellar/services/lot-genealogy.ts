import type { Deposit, Lot, Occupation } from '../types'
import { apiRequest } from '../../../services/api-client'

export interface LotUnit { code: string; depositCode: string; occupation: Occupation; active: boolean }
export interface LineageEvent { origin: string; destination: string; date: string; movement: string; volumeLiters: number; note: string }

export function getLotUnits(lot: Lot, deposits: Deposit[]): LotUnit[] {
  return deposits.flatMap((deposit) => deposit.occupations.filter((occupation) => occupation.lotCode === lot.code && lot.contentCodes.includes(occupation.contentCode)).map((occupation) => ({ code: occupation.contentCode, depositCode: deposit.code, occupation, active: !occupation.exitDate })))
}

export interface GenealogyApi { getEvents(lot: Lot, deposits: Deposit[]): Promise<LineageEvent[]> }
export const genealogyApi: GenealogyApi = { getEvents(lot) { return apiRequest<LineageEvent[]>(`/api/lots/${encodeURIComponent(lot.code)}/genealogy`) } }
