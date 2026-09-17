export type DepositStatus = 'occupied' | 'available' | 'maintenance' | 'cleaning'
export type CellarPriority = 'critical' | 'overdue' | 'high' | 'none'

export interface Occupation {
  contentCode: string
  lotCode: string
  entryDate: string
  exitDate?: string
  volumeLiters: number
  category: string
  alcoholicState: string
  malolacticState: string
}

export interface Deposit {
  id: string
  code: string
  center: string
  zone: string
  position: string
  capacityLiters: number
  nominalCapacityLiters?: number
  material: string
  refrigerated: boolean
  status: DepositStatus
  priority: CellarPriority
  lastControl?: string
  lastControlAge?: string
  nextTask?: string
  occupations: Occupation[]
  cleaningHistory: { date: string; action: string; responsible: string; result: string }[]
}

export interface Lot {
  code: string
  campaign: number
  category: string
  destination: string
  responsible: string
  entryDate: string
  origin: string
  variety: string
  archived: boolean
  contentCodes: string[]
}

export interface NewDeposit {
  code: string
  center: string
  zone: string
  position: string
  capacityLiters: number
  material: string
  refrigerated: boolean
}

export interface NewLot {
  code: string
  campaign: number
  category: string
  destination: string
  responsible: string
  entryDate: string
  origin: string
  variety: string
}

export interface NewEntry {
  depositCode: string
  volumeLiters: number
  effectiveDate: string
}

export type MovementType = 'Trasiego' | 'Trasvase' | 'Salida'

export interface NewMovement {
  type: MovementType
  effectiveDate: string
  effectiveTime: string
  responsible: string
  reason: string
  sourceDeposit: string
  destinationDeposit: string
  volumeLiters: number
  lossLiters: number
}

export interface MovementResult {
  code: string
  becameMixture: boolean
  sourceFinalLiters: number
  destinationContentCode: string
  destinationFinalLiters: number
}
