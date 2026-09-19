import { DEFAULT_WATER_TEMPERATURE, MOLECULAR_SO2_CODE, MOLECULAR_SO2_PKA, RULES, RULE_NOTE, SO2_FROM_METABISULFITE_MG_L_PER_G_HL, STALE_READING_DAYS, WATER_PH, WATER_VALUES, ruleOf } from './rules'
import type { Addition, BlendResult, ComponentReading, ParameterMeta, ParameterResult, WineComponent } from './types'

const ORDER = Object.keys(RULES)
const MOLECULAR_META: ParameterMeta = { code: MOLECULAR_SO2_CODE, name: 'SO₂ molecular', unit: 'mg/L', decimals: 2 }

const label = (component: WineComponent) => component.depositCode ?? component.id
const hasValue = (reading: ComponentReading | undefined): reading is ComponentReading =>
  reading !== undefined && reading.qualifier !== 'NOT_MEASURED' && (reading.qualifier !== 'NONE' || reading.value !== null)

/** Extremes of a reading: a "< L" (or "not detected") result is anywhere between 0 and L. */
function extremes(reading: ComponentReading): { low: number; high: number } {
  if (reading.qualifier === 'NONE') return { low: reading.value as number, high: reading.value as number }
  return { low: 0, high: reading.limit ?? 0 }
}

/** Sum of the volume-weighted contributions of the water additions for a linear parameter. */
function waterContribution(code: string, additions: Addition[]): number {
  const waters = additions.filter((addition) => addition.type === 'WATER')
  if (code === 'CONTENT_TEMPERATURE') return waters.reduce((sum, water) => sum + water.amount * (water.waterTemperature ?? DEFAULT_WATER_TEMPERATURE), 0)
  return waters.reduce((sum, water) => sum + water.amount * (WATER_VALUES[code] ?? 0), 0)
}

/**
 * Estimates the wine that results from mixing `components` (litres each) and applying `additions`.
 * Pure and synchronous: it never rounds (round only when displaying) and never invents a missing value.
 */
export function simulateBlend(components: WineComponent[], additions: Addition[], parameters: ParameterMeta[]): BlendResult {
  const wine = components.filter((component) => component.volumeLiters > 0)
  const waterLiters = additions.filter((addition) => addition.type === 'WATER').reduce((sum, addition) => sum + addition.amount, 0)
  const wineLiters = wine.reduce((sum, component) => sum + component.volumeLiters, 0)
  const total = wineLiters + waterLiters
  if (total <= 0) return { totalLiters: 0, wineLiters: 0, waterLiters: 0, parameters: [] }

  const catalog = new Map(parameters.map((parameter) => [parameter.code, parameter]))
  const metaOf = (code: string): ParameterMeta => catalog.get(code) ?? { code, name: code, unit: null, decimals: 2 }
  const codes = [...new Set(wine.flatMap((component) => Object.keys(component.readings)))]
  const results = new Map<string, ParameterResult>()

  for (const code of codes) {
    const rule = ruleOf(code)
    const base: ParameterResult = {
      parameter: metaOf(code), rule, status: 'OK', value: null, qualifier: 'NONE', lowerBound: null,
      componentMin: null, componentMax: null, missing: [], notes: [RULE_NOTE[rule]],
    }
    if (rule === 'NOT_BLENDABLE') { results.set(code, { ...base, status: 'NOT_BLENDABLE' }); continue }

    const missing = wine.filter((component) => !hasValue(component.readings[code])).map(label)
    if (waterLiters > 0 && rule !== 'PH_HPLUS' && !(code in WATER_VALUES) && code !== 'CONTENT_TEMPERATURE') missing.push('Agua')
    if (missing.length > 0) { results.set(code, { ...base, status: 'INCOMPLETE', missing }); continue }

    const readings = wine.map((component) => ({ component, reading: component.readings[code] }))
    const numeric = readings.filter(({ reading }) => reading.qualifier === 'NONE').map(({ reading }) => reading.value as number)
    base.componentMin = numeric.length ? Math.min(...numeric) : null
    base.componentMax = numeric.length ? Math.max(...numeric) : null

    for (const { component, reading } of readings) {
      if (reading.daysAgo > STALE_READING_DAYS) base.notes.push(`Dato de hace ${reading.daysAgo} días en ${label(component)}`)
      if (!reading.validated) base.notes.push(`Sin validar en ${label(component)}`)
    }

    if (rule === 'PH_HPLUS') {
      if (readings.some(({ reading }) => reading.qualifier !== 'NONE')) {
        results.set(code, { ...base, status: 'INCOMPLETE', missing: readings.filter(({ reading }) => reading.qualifier !== 'NONE').map(({ component }) => label(component)) })
        continue
      }
      const hPlus = readings.reduce((sum, { component, reading }) => sum + component.volumeLiters * 10 ** -(reading.value as number), 0)
        + waterLiters * 10 ** -WATER_PH
      base.value = -Math.log10(hPlus / total)
      if (additions.some((addition) => addition.type === 'TARTARIC_ACID' && addition.amount > 0)) {
        base.notes.push('El ácido añadido bajará el pH; la magnitud depende del poder tampón.')
      }
      results.set(code, base)
      continue
    }

    const water = waterContribution(code, additions)
    const bounds = readings.map(({ component, reading }) => ({ volume: component.volumeLiters, ...extremes(reading) }))
    const high = (bounds.reduce((sum, item) => sum + item.volume * item.high, 0) + water) / total
    const low = (bounds.reduce((sum, item) => sum + item.volume * item.low, 0) + water) / total
    const qualified = readings.some(({ reading }) => reading.qualifier !== 'NONE')
    base.value = high
    base.qualifier = qualified || rule === 'UPPER_BOUND' ? 'AT_MOST' : 'NONE'
    base.lowerBound = qualified ? low : null
    results.set(code, base)
  }

  applyAdditions(results, additions)
  addMolecularSo2(results)

  const ordered = [...results.values()].sort((a, b) => rank(a) - rank(b) || a.parameter.name.localeCompare(b.parameter.name, 'es'))
  return { totalLiters: total, wineLiters, waterLiters, parameters: ordered }
}

function rank(result: ParameterResult): number {
  if (result.parameter.code === MOLECULAR_SO2_CODE) return 100_000
  if (result.status === 'NOT_BLENDABLE') return 50_000
  const position = ORDER.indexOf(result.parameter.code)
  return position === -1 ? 10_000 : position
}

/** Chemical additions are expressed on the final volume, so they add a fixed amount to the estimated value. */
function applyAdditions(results: Map<string, ParameterResult>, additions: Addition[]) {
  const add = (code: string, amount: number) => {
    const result = results.get(code)
    if (!result || amount === 0) return
    if (result.status !== 'OK' || result.value === null) {
      result.notes.push('No se puede sumar la adición: falta el dato de partida.')
      return
    }
    result.value += amount
    if (result.lowerBound !== null) result.lowerBound += amount
  }
  for (const addition of additions) {
    if (addition.amount <= 0) continue
    if (addition.type === 'TARTARIC_ACID') {
      add('TOTAL_ACIDITY', addition.amount / 100)
      add('TOTAL_ACIDITY_TH2', addition.amount / 100)
    } else if (addition.type === 'POTASSIUM_METABISULFITE') {
      const so2 = addition.amount * SO2_FROM_METABISULFITE_MG_L_PER_G_HL
      add('FREE_SO2', so2)
      add('TOTAL_SO2', so2)
    } else if (addition.type === 'SO2_SOLUTION') {
      add('FREE_SO2', addition.amount)
      add('TOTAL_SO2', addition.amount)
    }
  }
}

/** Molecular SO₂ = free SO₂ / (1 + 10^(pH − 1.81)); only when both inputs were computed. */
function addMolecularSo2(results: Map<string, ParameterResult>) {
  const free = results.get('FREE_SO2')
  const ph = results.get('PH')
  if (!free || !ph || free.status !== 'OK' || ph.status !== 'OK' || free.value === null || ph.value === null) return
  const factor = 1 + 10 ** (ph.value - MOLECULAR_SO2_PKA)
  results.set(MOLECULAR_SO2_CODE, {
    parameter: MOLECULAR_META, rule: 'UPPER_BOUND', status: 'OK', value: free.value / factor, qualifier: 'AT_MOST',
    lowerBound: free.lowerBound === null ? null : free.lowerBound / factor, componentMin: null, componentMax: null, missing: [],
    notes: ['Estimación a partir del SO₂ libre (máximo) y del pH (orientativo).'],
  })
}
