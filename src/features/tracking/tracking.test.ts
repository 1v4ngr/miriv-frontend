import { describe, expect, it } from 'vitest'
import { seriesToCsv } from './export'
import type { SeriesResponse, TargetRange } from './services/tracking-api'
import { evaluateStatus, formatAge, formatReading, formatSpan, plotValue } from './utils'

const range: TargetRange = { content: 'C-1', parameter: 'VOLATILE_ACIDITY', warnMin: null, warnMax: 0.6, critMin: null, critMax: 0.8 }
const sulfur: TargetRange = { content: 'C-1', parameter: 'FREE_SO2', warnMin: 15, warnMax: null, critMin: 8, critMax: null }

describe('evaluateStatus', () => {
  it('compares plain values with warning and critical bounds', () => {
    expect(evaluateStatus({ value: 0.5, qualifier: 'NONE', limit: null }, range)).toBe('OK')
    expect(evaluateStatus({ value: 0.72, qualifier: 'NONE', limit: null }, range)).toBe('WARN')
    expect(evaluateStatus({ value: 0.9, qualifier: 'NONE', limit: null }, range)).toBe('CRIT')
    expect(evaluateStatus({ value: 0.9, qualifier: 'NONE', limit: null }, undefined)).toBe('NONE')
  })

  it('never invents a value for "< limit" results', () => {
    expect(evaluateStatus({ value: null, qualifier: 'LESS_THAN', limit: 0.1 }, range)).toBe('OK')
    expect(evaluateStatus({ value: null, qualifier: 'LESS_THAN', limit: 5 }, sulfur)).toBe('CRIT')
    expect(evaluateStatus({ value: null, qualifier: 'LESS_THAN', limit: 12 }, sulfur)).toBe('WARN')
    expect(evaluateStatus({ value: null, qualifier: 'LESS_THAN', limit: 20 }, sulfur)).toBe('UNKNOWN')
    expect(evaluateStatus({ value: null, qualifier: 'NOT_MEASURED', limit: null }, sulfur)).toBe('NONE')
  })
})

describe('formatting', () => {
  it('shows qualifiers as the lab reported them', () => {
    expect(formatReading(0.72, 'NONE', null, 2)).toBe('0,72')
    expect(formatReading(null, 'LESS_THAN', 0.05, 2)).toBe('< 0,05')
    expect(formatReading(null, 'NOT_DETECTED', null, 2)).toBe('n.d.')
  })

  it('plots a "< limit" result at its limit and skips unmeasured ones', () => {
    const base = { content: 'C-1', parameter: 'P', takenAt: '2026-09-01T10:00:00Z', validated: true, sampleCode: 'S', method: null }
    expect(plotValue({ ...base, value: null, qualifier: 'LESS_THAN', limit: 0.05 })).toBe(0.05)
    expect(plotValue({ ...base, value: null, qualifier: 'NOT_MEASURED', limit: null })).toBeNull()
  })

  it('describes ages and spans', () => {
    expect(formatAge(0)).toBe('hoy')
    expect(formatAge(3)).toBe('hace 3 d')
    expect(formatAge(null)).toBe('sin análisis')
    expect(formatSpan('2026-09-01T10:00:00Z', '2026-09-03T14:00:00Z')).toBe('2 d 4 h')
  })
})

describe('seriesToCsv', () => {
  it('writes an Excel-friendly file with decimal commas and quoted fields', () => {
    const series: SeriesResponse = {
      contents: [{ code: 'C-1', deposit: 'D-1', lot: 'L-1', category: 'RED', startedAt: null, ancestor: false, descendantCode: null }],
      parameters: [{ code: 'PH', name: 'pH', unit: null, decimals: 2 }],
      points: [{ content: 'C-1', parameter: 'PH', takenAt: '2026-09-01T10:00:00Z', value: 3.42, qualifier: 'NONE', limit: null, validated: true, sampleCode: 'S-1', method: 'Sonda; "A"' }],
      targets: [],
    }
    const [header, row] = seriesToCsv(series).split('\r\n')
    expect(header.startsWith('Contenido;Depósito;Parámetro')).toBe(true)
    expect(row).toBe('C-1;D-1;pH;;2026-09-01T10:00:00Z;3,42;NONE;;Sí;S-1;"Sonda; ""A"""')
  })
})
