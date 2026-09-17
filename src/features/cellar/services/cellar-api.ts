import { initialDeposits, initialLots } from '../data/mock-cellar'
import type { Deposit, Lot, MovementResult, NewDeposit, NewEntry, NewLot, NewMovement, Occupation } from '../types'
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

const deposits = structuredClone(initialDeposits)
const lots = structuredClone(initialLots)

function wait() { return new Promise<void>((resolve) => window.setTimeout(resolve, 250)) }
function normalizedCode(value: string) { return value.trim().toUpperCase().replace(/\s+/g, '') }

const mockCellarApi: CellarApi = {
  async getDeposits() { await wait(); return structuredClone(deposits) },
  async getDeposit(code) { await wait(); return structuredClone(deposits.find((deposit) => normalizedCode(deposit.code) === normalizedCode(code))) },
  async createDeposit(input) {
    await wait()
    const code = normalizedCode(input.code)
    if (!code || !input.center.trim() || !input.zone.trim()) throw new Error('Completa código, centro y zona.')
    if (!Number.isFinite(input.capacityLiters) || input.capacityLiters <= 0) throw new Error('La capacidad útil debe ser mayor que cero.')
    if (deposits.some((deposit) => normalizedCode(deposit.code) === code && deposit.center === input.center)) throw new Error('Ya existe un depósito con ese código en el centro.')
    const deposit: Deposit = { ...input, id: crypto.randomUUID(), code, status: 'available', priority: 'none', occupations: [], cleaningHistory: [] }
    deposits.unshift(deposit)
    return structuredClone(deposit)
  },
  async updateDeposit(code, input) {
    await wait()
    const deposit = deposits.find((item) => normalizedCode(item.code) === normalizedCode(code))
    if (!deposit) throw new Error('No se encuentra el depósito.')
    const occupiedLiters = deposit.occupations.find((occupation) => !occupation.exitDate)?.volumeLiters ?? 0
    if (!Number.isFinite(input.capacityLiters) || input.capacityLiters <= 0) throw new Error('La capacidad útil debe ser mayor que cero.')
    if (input.capacityLiters < occupiedLiters) throw new Error('La capacidad útil no puede ser menor que el volumen ocupado.')
    if (!input.zone.trim()) throw new Error('Indica la zona del depósito.')
    Object.assign(deposit, input)
    return structuredClone(deposit)
  },
  async getLots() { await wait(); return structuredClone(lots) },
  async getLot(code) { await wait(); return structuredClone(lots.find((lot) => normalizedCode(lot.code) === normalizedCode(code))) },
  async updateLot(code, input) {
    await wait()
    const lot = lots.find((item) => normalizedCode(item.code) === normalizedCode(code))
    if (!lot) throw new Error('No se encuentra el lote.')
    if (!input.destination.trim() || !input.responsible.trim()) throw new Error('Destino y responsable son obligatorios.')
    Object.assign(lot, input)
    return structuredClone(lot)
  },
  async createLot(input, entry) {
    await wait()
    const code = normalizedCode(input.code)
    if (!code || !input.campaign || !input.category || !input.destination || !input.responsible.trim() || !input.entryDate) throw new Error('Completa los datos obligatorios del lote.')
    if (lots.some((lot) => normalizedCode(lot.code) === code)) throw new Error('Ya existe un lote con ese código.')
    let target: Deposit | undefined
    if (entry) {
      target = deposits.find((deposit) => normalizedCode(deposit.code) === normalizedCode(entry.depositCode))
      if (!target) throw new Error('Selecciona un depósito válido.')
      if (target.status !== 'available') throw new Error('El depósito no está disponible para entradas.')
      if (!Number.isFinite(entry.volumeLiters) || entry.volumeLiters <= 0) throw new Error('El volumen debe ser mayor que cero.')
      if (entry.volumeLiters > target.capacityLiters) throw new Error('La entrada supera la capacidad útil del depósito.')
      if (!entry.effectiveDate) throw new Error('Indica la fecha efectiva de entrada.')
    }
    const contentCode = entry ? `C-${input.campaign}-${String(100 + lots.length).padStart(3, '0')}` : undefined
    const lot: Lot = { ...input, code, origin: input.origin.trim() || 'Procedencia incompleta', variety: input.variety.trim() || 'Pendiente de determinar', archived: false, contentCodes: contentCode ? [contentCode] : [] }
    if (entry && target && contentCode) {
      const occupation: Occupation = { contentCode, lotCode: code, entryDate: entry.effectiveDate, volumeLiters: entry.volumeLiters, category: input.category, alcoholicState: 'Sin confirmar', malolacticState: 'Sin confirmar' }
      target.occupations.unshift(occupation)
      target.status = 'occupied'
      target.priority = 'none'
    }
    lots.unshift(lot)
    return structuredClone(lot)
  },
  async registerMovement(input) {
    await wait()
    const source = deposits.find((deposit) => normalizedCode(deposit.code) === normalizedCode(input.sourceDeposit))
    if (!source) throw new Error('No se encuentra el depósito de origen.')
    const sourceOccupation = source.occupations.find((occupation) => !occupation.exitDate)
    if (!sourceOccupation) throw new Error('El depósito de origen no tiene contenido activo.')
    if (!Number.isFinite(input.volumeLiters) || input.volumeLiters <= 0) throw new Error('El volumen movido debe ser mayor que cero.')
    if (!Number.isFinite(input.lossLiters) || input.lossLiters < 0) throw new Error('La merma no puede ser negativa.')
    const withdrawn = input.volumeLiters + input.lossLiters
    if (withdrawn > sourceOccupation.volumeLiters) throw new Error('El volumen retirado supera el contenido disponible en origen.')
    if (!input.responsible.trim() || !input.reason.trim() || !input.effectiveDate) throw new Error('Completa responsable, motivo y fecha efectiva.')

    let destination: Deposit | undefined
    if (input.type !== 'Salida') {
      destination = deposits.find((deposit) => normalizedCode(deposit.code) === normalizedCode(input.destinationDeposit))
      if (!destination) throw new Error('Selecciona un depósito de destino.')
      if (destination.status === 'maintenance' || destination.status === 'cleaning') throw new Error('El depósito de destino no admite movimientos.')
    }

    const destinationOccupation = destination?.occupations.find((occupation) => !occupation.exitDate)
    const becameMixture = Boolean(destinationOccupation)
    const sourceLot = lots.find((lot) => lot.code === sourceOccupation.lotCode)
    const campaign = sourceLot?.campaign ?? new Date().getFullYear()
    const destinationContentCode = destination ? (becameMixture ? `C-${campaign}-${String(100 + lots.length + 1).padStart(3, '0')}` : sourceOccupation.contentCode) : ''

    sourceOccupation.volumeLiters -= withdrawn
    if (sourceOccupation.volumeLiters <= 0) {
      sourceOccupation.exitDate = input.effectiveDate
      source.status = 'available'
      source.priority = 'none'
    }

    if (destination) {
      const destinationLotCode = becameMixture && destinationOccupation ? destinationOccupation.lotCode : sourceOccupation.lotCode
      const destinationLot = lots.find((lot) => lot.code === destinationLotCode)
      if (destinationOccupation) destinationOccupation.exitDate = input.effectiveDate
      const newOccupation: Occupation = {
        contentCode: destinationContentCode,
        lotCode: destinationLotCode,
        entryDate: input.effectiveDate,
        volumeLiters: (destinationOccupation?.volumeLiters ?? 0) + input.volumeLiters,
        category: destinationOccupation?.category ?? sourceOccupation.category,
        alcoholicState: becameMixture ? 'Sin confirmar tras mezcla' : sourceOccupation.alcoholicState,
        malolacticState: becameMixture ? 'Sin confirmar tras mezcla' : sourceOccupation.malolacticState,
      }
      destination.occupations.unshift(newOccupation)
      destination.status = 'occupied'
      if (destinationLot && !destinationLot.contentCodes.includes(destinationContentCode)) destinationLot.contentCodes.push(destinationContentCode)
      if (becameMixture && sourceLot && !sourceLot.contentCodes.includes(destinationContentCode)) sourceLot.contentCodes.push(destinationContentCode)
    }

    return {
      code: `MOV-${campaign}-${String(1000 + lots.length + deposits.length).slice(-4)}`,
      becameMixture,
      sourceFinalLiters: Math.max(0, sourceOccupation.volumeLiters),
      destinationContentCode,
      destinationFinalLiters: destination ? (destinationOccupation?.volumeLiters ?? 0) + input.volumeLiters : 0,
    }
  },
}

const realCellarApi: CellarApi = {
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

export const cellarApi: CellarApi = import.meta.env.VITE_API_MODE === 'mock' ? mockCellarApi : realCellarApi
