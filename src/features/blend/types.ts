import type { LatestContent, Qualifier } from '../tracking/services/tracking-api'

export type BlendRule = 'LINEAR' | 'LINEAR_APPROX' | 'PH_HPLUS' | 'UPPER_BOUND' | 'NOT_BLENDABLE'
export type AdditionType = 'WATER' | 'TARTARIC_ACID' | 'POTASSIUM_METABISULFITE' | 'SO2_SOLUTION'

export interface ComponentReading { value: number | null; qualifier: Qualifier; limit: number | null; daysAgo: number; validated: boolean }

export interface WineComponent {
  kind: 'wine'
  id: string                 // contentCode
  label: string              // "D-04 · C-2026-001"
  depositCode: string | null
  categoryCode: string | null
  lotCode: string
  availableLiters: number | null
  volumeLiters: number
  readings: Record<string, ComponentReading>   // key = parameter.code
}

/** amount: litres (WATER), g/hL (TARTARIC_ACID, POTASSIUM_METABISULFITE) or mg/L of SO₂ (SO2_SOLUTION). */
export interface Addition { id: string; type: AdditionType; amount: number; waterTemperature?: number }

export interface ParameterMeta { code: string; name: string; unit: string | null; decimals: number }

export type ResultStatus = 'OK' | 'INCOMPLETE' | 'NOT_BLENDABLE' | 'NO_DATA'

export interface ParameterResult {
  parameter: ParameterMeta
  rule: BlendRule
  status: ResultStatus
  value: number | null
  /** AT_MOST: the real value is between `lowerBound` and `value` (a "< limit" was involved, or the rule is an upper bound). */
  qualifier: 'NONE' | 'AT_MOST'
  lowerBound: number | null
  componentMin: number | null
  componentMax: number | null
  missing: string[]
  notes: string[]
}

export interface BlendResult {
  totalLiters: number
  wineLiters: number
  waterLiters: number
  parameters: ParameterResult[]
}

/** Adapter from /api/tracking/latest. */
export function toComponent(content: LatestContent, volumeLiters: number): WineComponent {
  return {
    kind: 'wine',
    id: content.content,
    label: `${content.deposit ?? '—'} · ${content.content}`,
    depositCode: content.deposit,
    categoryCode: content.categoryCode,
    lotCode: content.lot,
    availableLiters: content.volumeLiters,
    volumeLiters,
    readings: Object.fromEntries(content.readings.map((reading) => [reading.parameter, {
      value: reading.value, qualifier: reading.qualifier, limit: reading.limit, daysAgo: reading.daysAgo, validated: reading.validated,
    }])),
  }
}
