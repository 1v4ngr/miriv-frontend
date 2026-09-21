export type DepositStatus = 'occupied' | 'available' | 'maintenance' | 'pending_cleaning' | 'cleaning'
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
  // F2-03: zone can be null for deposits that have not been assigned a zone yet.
  zone?: string | null
  position: string
  capacityLiters: number
  nominalCapacityLiters?: number
  material: string
  refrigerated: boolean
  status: DepositStatus
  priority: CellarPriority
  lastControl?: string
  lastControlAge?: string
  occupations: Occupation[]
  cleaningHistory: { date: string; action: string; responsible: string; result: string }[]
}

export interface Lot {
  code: string
  campaign: number
  // F2-03: category and destination are null when the lot does not yet have one assigned;
  // the front renders "Sin categoría" / "Sin destino" in those cases.
  category?: string | null
  destination?: string | null
  responsible: string
  responsibleUsername?: string
  entryDate: string
  origin: string
  variety: string
  varieties: string[]
  archived: boolean
  contentCodes: string[]
  activeContentCodes: string[]
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
  varieties: string[]
}

export interface NewEntry {
  depositCode: string
  volumeLiters: number
  effectiveDate: string
}

export type MovementType = 'Trasiego' | 'Trasvase' | 'Salida'
// F4-01: lifecycle of a movement (planned → executed, or cancelled).
export type MovementStatus = 'PLANNED' | 'EXECUTED' | 'CANCELLED'

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
  authorizeMixture: boolean
  idempotencyKey: string
  // F4-01: when true, the wizard saves the body as PLANNED without touching deposits.
  planned?: boolean
  // F2-06: balance snapshot the wizard took when the user confirmed. If the server
  // finds a different volume when the request arrives, it rejects with STALE_BALANCE
  // instead of overwriting the change that happened behind our back.
  expectedSourceLiters?: number
  expectedDestinationLiters?: number
}

export interface MovementResult {
  code: string
  becameMixture: boolean
  sourceFinalLiters: number
  destinationContentCode: string
  destinationFinalLiters: number
}
