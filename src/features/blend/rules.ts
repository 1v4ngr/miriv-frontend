import type { BlendRule } from './types'

/** How each parameter behaves when wines are mixed (see tareas/F7_simulador_mezclas.md, "Fundamento técnico"). */
export const RULES: Record<string, BlendRule> = {
  TOTAL_ACIDITY: 'LINEAR', TOTAL_ACIDITY_TH2: 'LINEAR', VOLATILE_ACIDITY: 'LINEAR', REDUCING_SUGARS: 'LINEAR',
  GLUCOSE_FRUCTOSE: 'LINEAR', GLUCOSE: 'LINEAR', FRUCTOSE: 'LINEAR', MALIC_ACID: 'LINEAR', L_MALIC_ACID: 'LINEAR',
  L_LACTIC_ACID: 'LINEAR', GLUCONIC_ACID: 'LINEAR', TOTAL_SO2: 'LINEAR', YAN: 'LINEAR', ETHANOL: 'LINEAR',
  POTENTIAL_ALCOHOL: 'LINEAR', DENSITY: 'LINEAR', CONTENT_TEMPERATURE: 'LINEAR',
  BRIX_BAUME: 'LINEAR_APPROX',
  PH: 'PH_HPLUS',
  FREE_SO2: 'UPPER_BOUND', DISSOLVED_CO2: 'UPPER_BOUND',
}

/** Anything not listed (DISSOLVED_OXYGEN, TURBIDITY, SAMPLE_TEMPERATURE, unknown codes…) cannot be estimated. */
export const ruleOf = (code: string): BlendRule => RULES[code] ?? 'NOT_BLENDABLE'

export const RULE_NOTE: Record<BlendRule, string> = {
  LINEAR: 'Cálculo por volumen',
  LINEAR_APPROX: 'Aproximado: se mide en masa, no en volumen',
  PH_HPLUS: 'Orientativo: el pH depende del poder tampón; confirmar con prueba de banco',
  UPPER_BOUND: 'Máximo esperado: parte se combinará o se perderá al trasegar',
  NOT_BLENDABLE: 'No se puede estimar: mide tras la mezcla',
}

export const WATER_DENSITY = 0.9982
export const WATER_PH = 7.0
export const DEFAULT_WATER_TEMPERATURE = 15

/** Value of water for each linear parameter; anything else is unknown for water. */
export const WATER_VALUES: Record<string, number> = {
  TOTAL_ACIDITY: 0, TOTAL_ACIDITY_TH2: 0, VOLATILE_ACIDITY: 0, REDUCING_SUGARS: 0, GLUCOSE_FRUCTOSE: 0, GLUCOSE: 0,
  FRUCTOSE: 0, MALIC_ACID: 0, L_MALIC_ACID: 0, L_LACTIC_ACID: 0, GLUCONIC_ACID: 0, TOTAL_SO2: 0, YAN: 0, ETHANOL: 0,
  POTENTIAL_ALCOHOL: 0, BRIX_BAUME: 0, FREE_SO2: 0, DISSOLVED_CO2: 0, DENSITY: WATER_DENSITY,
}

/** Potassium metabisulfite is 57.6 % SO₂ and 1 g/hL = 10 mg/L, so 1 g/hL adds 5.76 mg/L of SO₂. */
export const SO2_FROM_METABISULFITE_MG_L_PER_G_HL = 5.76
export const MOLECULAR_SO2_PKA = 1.81
export const STALE_READING_DAYS = 7

export const MOLECULAR_SO2_CODE = 'MOLECULAR_SO2'
