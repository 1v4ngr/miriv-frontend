import { describe, expect, it } from 'vitest'
import type { ReportOptions } from './services/reports-api'
import { matchingDeposits } from './utils'

const options: ReportOptions = {
  zones: [], categories: [], phases: [],
  deposits: [
    { code: 'A-1', name: null, zone: 'I', content: 'C-1', category: 'MUST', phase: 'ALCOHOLIC' },
    { code: 'A-2', name: null, zone: 'E', content: 'C-2', category: 'RED', phase: 'WINE' },
    { code: 'A-3', name: null, zone: 'E', content: 'C-3', category: 'RED', phase: 'NONE' },
    { code: 'A-4', name: null, zone: 'E', content: null, category: null, phase: null },
  ],
}
const none = { zones: [], deposits: [], phases: [], categories: [] }

describe('matchingDeposits', () => {
  it('counts only occupied deposits, empty filters meaning all', () => {
    expect(matchingDeposits(options, none)).toBe(3)
    expect(matchingDeposits(undefined, none)).toBe(0)
  })
  it('combines zone, deposit, category and phase filters', () => {
    expect(matchingDeposits(options, { ...none, zones: ['e'] })).toBe(2)
    expect(matchingDeposits(options, { ...none, categories: ['RED'], phases: ['WINE'] })).toBe(1)
    expect(matchingDeposits(options, { ...none, phases: ['NONE'] })).toBe(1)
    expect(matchingDeposits(options, { ...none, deposits: ['A-1', 'A-4'] })).toBe(1)
  })
})
