import { describe, expect, it } from 'vitest'
import { solveBlend, type SolveInput } from './solver'
import type { ComponentReading, ParameterMeta, WineComponent } from './types'

const parameters: ParameterMeta[] = [
  { code: 'VOLATILE_ACIDITY', name: 'Acidez volátil', unit: 'g/L', decimals: 2 },
  { code: 'ETHANOL', name: 'Etanol', unit: '% vol.', decimals: 1 },
  { code: 'PH', name: 'pH', unit: null, decimals: 2 },
]
function tank(id: string, available: number, values: Record<string, number>): WineComponent {
  const readings: Record<string, ComponentReading> = Object.fromEntries(Object.entries(values).map(([code, value]) => [code, { value, qualifier: 'NONE', limit: null, daysAgo: 0, validated: true }]))
  return { kind: 'wine', id, label: id, depositCode: id, categoryCode: 'RED', lotCode: 'L', availableLiters: available, volumeLiters: 0, readings }
}
const base = (patch: Partial<SolveInput>): SolveInput => ({
  components: [], targets: [], totalMin: null, totalMax: null, goal: { kind: 'MAX_VOLUME' }, parameters, ...patch,
})
const A = tank('A', 5000, { VOLATILE_ACIDITY: 0.3 })
const B = tank('B', 5000, { VOLATILE_ACIDITY: 0.8 })

describe('solveBlend', () => {
  it('S1: maximises the volume under an acidity ceiling', () => {
    const out = solveBlend(base({ components: [A, B], targets: [{ parameter: 'VOLATILE_ACIDITY', min: null, max: 0.5 }] }))
    if (!out.ok) throw new Error(out.reason)
    expect(out.volumes.A).toBeCloseTo(5000, 1)
    expect(out.volumes.B).toBeCloseTo(3333.3, 1)
    expect(out.total).toBeCloseTo(8333.3, 1)
    expect(out.rounded).toEqual({ A: 5000, B: 3333 })
  })

  it('S2: a fixed total with as much of B as possible', () => {
    const out = solveBlend(base({
      components: [A, B], targets: [{ parameter: 'VOLATILE_ACIDITY', min: null, max: 0.5 }], totalMin: 6000, totalMax: 6000,
      goal: { kind: 'MAX_COMPONENT', componentId: 'B' },
    }))
    if (!out.ok) throw new Error(out.reason)
    expect(out.volumes.A).toBeCloseTo(3600, 1)
    expect(out.volumes.B).toBeCloseTo(2400, 1)
  })

  it('S3: explains the range that can be reached when the target is impossible', () => {
    const out = solveBlend(base({ components: [A, B], targets: [{ parameter: 'VOLATILE_ACIDITY', min: null, max: 0.25 }] }))
    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.reason).toContain('solo puede ir de 0,30 a 0,80')
  })

  it('S4: three tanks, two targets', () => {
    const out = solveBlend(base({
      components: [
        tank('A', 2000, { ETHANOL: 12, VOLATILE_ACIDITY: 0.3 }),
        tank('B', 4000, { ETHANOL: 15, VOLATILE_ACIDITY: 0.7 }),
        tank('C', 2000, { ETHANOL: 13.5, VOLATILE_ACIDITY: 0.4 }),
      ],
      targets: [{ parameter: 'ETHANOL', min: 13.5, max: null }, { parameter: 'VOLATILE_ACIDITY', min: null, max: 0.5 }],
    }))
    if (!out.ok) throw new Error(out.reason)
    expect(out.volumes.A).toBeCloseTo(2000, 1)
    expect(out.volumes.B).toBeCloseTo(3000, 1)
    expect(out.volumes.C).toBeCloseTo(2000, 1)
    expect(out.total).toBeCloseTo(7000, 1)
  })

  it('S5: refuses a target with a missing reading and names the tank', () => {
    const out = solveBlend(base({ components: [tank('A', 100, {}), B], targets: [{ parameter: 'VOLATILE_ACIDITY', min: null, max: 0.5 }] }))
    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.reason).toBe('Falta Acidez volátil en A: analízalo o quita ese objetivo.')
  })

  it('validates its inputs before solving', () => {
    const target = [{ parameter: 'VOLATILE_ACIDITY', min: null, max: 0.5 }]
    expect(solveBlend(base({ targets: target }))).toEqual({ ok: false, reason: 'Añade depósitos para buscar proporciones.' })
    expect(solveBlend(base({ components: [A] }))).toEqual({ ok: false, reason: 'Define al menos un objetivo.' })
    const ph = solveBlend(base({ components: [A], targets: [{ parameter: 'PH', min: 3.3, max: null }] }))
    expect(ph.ok === false && ph.reason).toContain('no se puede usar como objetivo')
    const minimum = solveBlend(base({ components: [A, B], targets: target, goal: { kind: 'MIN_COMPONENT', componentId: 'B' } }))
    expect(minimum.ok === false && minimum.reason).toContain('volumen total mínimo')
  })

  it('uses as little of a tank as possible while reaching a volume', () => {
    const out = solveBlend(base({
      components: [A, B], targets: [{ parameter: 'VOLATILE_ACIDITY', min: null, max: 0.6 }], totalMin: 4000, totalMax: 4000,
      goal: { kind: 'MIN_COMPONENT', componentId: 'B' },
    }))
    if (!out.ok) throw new Error(out.reason)
    expect(out.volumes.B).toBeCloseTo(0, 1)
    expect(out.volumes.A).toBeCloseTo(4000, 1)
  })

  it('says when there is not enough wine for the requested volume', () => {
    const out = solveBlend(base({ components: [A, B], targets: [{ parameter: 'VOLATILE_ACIDITY', min: null, max: 0.9 }], totalMin: 20000 }))
    expect(out.ok).toBe(false)
    if (!out.ok) expect(out.reason).toContain('No hay volumen suficiente')
  })
})
