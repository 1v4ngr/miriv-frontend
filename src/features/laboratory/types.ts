export type SampleStatus = 'Borrador' | 'Pendiente validar' | 'Análisis parcial' | 'Validado' | 'Invalidado'

export interface Sample {
  code: string
  originDeposit: string
  currentDeposit: string
  contentCode: string
  lotCode: string
  category: string
  takenAt: string
  takenDate: string
  age: string
  panel: string
  completed: number
  required: number
  status: SampleStatus
  responsible: string
  overdue?: boolean
  panelParameters: PanelParameter[]
  results: SampleResult[]
  observations?: string
  processedAt?: string
  laboratory?: string
  equipment?: string
  method?: string
  validationNote?: string
}

export interface PanelParameter {
  parameter: string
  unit: string
  required: boolean
}

export interface SampleResult {
  parameter: string
  value: string
  unit: string
  validity: string
  qualifier?: 'Menor que límite' | 'No medido' | 'No detectado'
  limit?: string
  method?: string
  versions?: { value: string; date: string; author: string; reason: string }[]
}

export interface NewSample {
  code: string
  originDeposit: string
  contentCode: string
  lotCode: string
  category: string
  takenAt: string
  takenDate: string
  panel: string
  responsible: string
  laboratoryCode?: string
  observations?: string
}

export interface ResultEntry {
  parameter: string
  value: string
  unit: string
  qualifier?: SampleResult['qualifier']
  limit?: string
}

export interface ResultsInput {
  results: ResultEntry[]
  status: Extract<SampleStatus, 'Borrador' | 'Pendiente validar'>
  processedAt: string
  laboratory: string
  equipment: string
  method: string
  observations?: string
}
