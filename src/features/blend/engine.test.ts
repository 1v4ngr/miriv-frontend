import { describe, expect, it } from 'vitest'
import { simulateBlend } from './engine'
import type { Addition, ComponentReading, ParameterMeta, ParameterResult, WineComponent } from './types'

const meta = (code: string, decimals = 2): ParameterMeta => ({ code, name: code, unit: null, decimals })
const catalog = ['TOTAL_ACIDITY', 'VOLATILE_ACIDITY', 'ETHANOL', 'DENSITY', 'PH', 'FREE_SO2', 'TOTAL_SO2', 'YAN'].map((code) => meta(code))

type Spec = number | { lt: number }
function wine(depositCode: string, liters: number, values: Record<string, Spec>, options: { daysAgo?: number; validated?: boolean } = {}): WineComponent {
  const readings: Record<string, ComponentReading> = {}
  for (const [code, spec] of Object.entries(values)) {
    readings[code] = typeof spec === 'number'
      ? { value: spec, qualifier: 'NONE', limit: null, daysAgo: options.daysAgo ?? 0, validated: options.validated ?? true }
      : { value: null, qualifier: 'LESS_THAN', limit: spec.lt, daysAgo: options.daysAgo ?? 0, validated: options.validated ?? true }
  }
  return { kind: 'wine', id: `C-${depositCode}`, label: depositCode, depositCode, categoryCode: 'RED', lotCode: 'L', availableLiters: liters, volumeLiters: liters, readings }
}
const water = (amount: number, waterTemperature?: number): Addition => ({ id: 'w', type: 'WATER', amount, waterTemperature })
const find = (parameters: ParameterResult[], code: string) => parameters.find((item) => item.parameter.code === code)!

describe('simulateBlend', () => {
  it('E1: linear parameters are volume-weighted', () => {
    const result = simulateBlend([
      wine('A', 1000, { VOLATILE_ACIDITY: 0.4, ETHANOL: 13.0, TOTAL_ACIDITY: 5.5 }),
      wine('B', 3000, { VOLATILE_ACIDITY: 0.6, ETHANOL: 14.2, TOTAL_ACIDITY: 6.3 }),
    ], [], catalog)
    expect(result.totalLiters).toBe(4000)
    expect(find(result.parameters, 'VOLATILE_ACIDITY').value).toBeCloseTo(0.55, 4)
    expect(find(result.parameters, 'ETHANOL').value).toBeCloseTo(13.9, 4)
    expect(find(result.parameters, 'TOTAL_ACIDITY').value).toBeCloseTo(6.1, 4)
    expect(find(result.parameters, 'ETHANOL').componentMin).toBe(13)
    expect(find(result.parameters, 'ETHANOL').componentMax).toBe(14.2)
  })

  it('E2: pH is mixed through [H+], not averaged', () => {
    const result = simulateBlend([wine('A', 1000, { PH: 3.4 }), wine('B', 3000, { PH: 3.7 })], [], catalog)
    const ph = find(result.parameters, 'PH')
    expect(ph.value).toBeCloseTo(3.6035, 4)
    expect(ph.value).not.toBeCloseTo(3.625, 3)
    expect(ph.notes.join(' ')).toContain('Orientativo')
  })

  it('E3: water dilutes everything, has density 0.9982 and pH 7, and is flagged', () => {
    const result = simulateBlend([wine('A', 900, { ETHANOL: 14, TOTAL_ACIDITY: 6, DENSITY: 0.993, PH: 3.5 })], [water(100)], catalog)
    expect(result.waterLiters).toBe(100)
    expect(result.totalLiters).toBe(1000)
    expect(find(result.parameters, 'ETHANOL').value).toBeCloseTo(12.6, 4)
    expect(find(result.parameters, 'TOTAL_ACIDITY').value).toBeCloseTo(5.4, 4)
    expect(find(result.parameters, 'DENSITY').value).toBeCloseTo(0.99352, 5)
    expect(find(result.parameters, 'PH').value).toBeCloseTo(3.5457, 4)
  })

  it('E4: a "< limit" result becomes an upper bound with a lower bound', () => {
    const result = simulateBlend([wine('A', 1000, { TOTAL_SO2: { lt: 5 } }), wine('B', 1000, { TOTAL_SO2: 30 })], [], catalog)
    const so2 = find(result.parameters, 'TOTAL_SO2')
    expect(so2.qualifier).toBe('AT_MOST')
    expect(so2.value).toBeCloseTo(17.5, 4)
    expect(so2.lowerBound).toBeCloseTo(15, 4)
  })

  it('E5: potassium metabisulfite adds 5.76 mg/L of SO2 per g/hL to free and total SO2', () => {
    const result = simulateBlend([wine('A', 4000, { FREE_SO2: 20, TOTAL_SO2: 80 })],
      [{ id: 'm', type: 'POTASSIUM_METABISULFITE', amount: 10 }], catalog)
    expect(find(result.parameters, 'FREE_SO2').value).toBeCloseTo(77.6, 4)
    expect(find(result.parameters, 'TOTAL_SO2').value).toBeCloseTo(137.6, 4)
    const solution = simulateBlend([wine('A', 4000, { FREE_SO2: 20 })], [{ id: 's', type: 'SO2_SOLUTION', amount: 12 }], catalog)
    expect(find(solution.parameters, 'FREE_SO2').value).toBeCloseTo(32, 4)
  })

  it('E6: molecular SO2 from free SO2 and pH', () => {
    const result = simulateBlend([wine('A', 1000, { FREE_SO2: 30, PH: 3.5 })], [], catalog)
    expect(find(result.parameters, 'MOLECULAR_SO2').value).toBeCloseTo(0.6003, 4)
    expect(result.parameters[result.parameters.length - 1].parameter.code).toBe('MOLECULAR_SO2')
  })

  it('E7: tartaric acid adds dose/100 g/L to total acidity and warns about pH', () => {
    const result = simulateBlend([wine('A', 4000, { TOTAL_ACIDITY: 6.1, PH: 3.5 })], [{ id: 't', type: 'TARTARIC_ACID', amount: 100 }], catalog)
    expect(find(result.parameters, 'TOTAL_ACIDITY').value).toBeCloseTo(7.1, 4)
    expect(find(result.parameters, 'PH').notes.join(' ')).toContain('bajará el pH')
  })

  it('E8: a parameter missing in one component is incomplete, never averaged over the rest', () => {
    const result = simulateBlend([wine('D-A', 1000, { YAN: 100, ETHANOL: 13 }), wine('D-B', 1000, { ETHANOL: 14 })], [], catalog)
    const yan = find(result.parameters, 'YAN')
    expect(yan.status).toBe('INCOMPLETE')
    expect(yan.value).toBeNull()
    expect(yan.missing).toEqual(['D-B'])
    expect(find(result.parameters, 'ETHANOL').value).toBeCloseTo(13.5, 4)
  })

  it('has nothing to say without volume, ignores zero-litre wines and marks unknown parameters as not blendable', () => {
    expect(simulateBlend([wine('A', 0, { ETHANOL: 13 })], [], catalog).parameters).toEqual([])
    const result = simulateBlend([wine('A', 500, { ETHANOL: 13, FOO: 1 }), wine('B', 0, { ETHANOL: 99 })], [], catalog)
    expect(find(result.parameters, 'FOO').status).toBe('NOT_BLENDABLE')
    expect(find(result.parameters, 'ETHANOL').value).toBe(13)
  })

  it('reports stale and unvalidated readings, and water on a parameter it cannot dilute', () => {
    const result = simulateBlend([wine('A', 1000, { ETHANOL: 13, PH: 3.4 }, { daysAgo: 12, validated: false })], [], catalog)
    const notes = find(result.parameters, 'ETHANOL').notes.join(' ')
    expect(notes).toContain('Dato de hace 12 días en A')
    expect(notes).toContain('Sin validar en A')
    const diluted = simulateBlend([wine('A', 1000, { ETHANOL: 13, FOO: 1 })], [water(100)], catalog)
    expect(find(diluted.parameters, 'FOO').status).toBe('NOT_BLENDABLE')
  })

  it('uses the water temperature for content temperature', () => {
    const result = simulateBlend([wine('A', 900, { CONTENT_TEMPERATURE: 20 })], [water(100, 10)], [meta('CONTENT_TEMPERATURE')])
    expect(find(result.parameters, 'CONTENT_TEMPERATURE').value).toBeCloseTo(19, 4)
  })
})
