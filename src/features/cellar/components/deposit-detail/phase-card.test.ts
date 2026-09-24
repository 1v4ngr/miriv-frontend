import { describe, expect, it } from 'vitest'
import { requiredCategories } from './phase-card'
import type { ReportPhase } from '../../../reports/services/reports-api'
import type { CatalogItem } from '../../../../services/catalog-api'

const categories: CatalogItem[] = [
  { id: '1', code: 'RED', name: 'Tinto', active: true },
  { id: '2', code: 'WHITE', name: 'Blanco', active: true },
  { id: '3', code: 'MUST', name: 'Mosto', active: true },
  { id: '4', code: 'OLD', name: 'Antigua', active: false },
]
const phase = (categoryCodes: string[], alcoholicStates: string[] = []): ReportPhase => ({ id: 'p', code: 'P', name: 'Fase', description: null, color: '#000000', position: 1, active: true, categoryCodes, alcoholicStates, malolacticStates: [], parameterCodes: [] })

describe('requiredCategories', () => {
  it('asks for Mosto when a wine moves to an unfermented must phase', () => {
    expect(requiredCategories(phase(['MUST'], ['NOT_STARTED']), 'RED', categories)?.map((item) => item.code)).toEqual(['MUST'])
  })
  it('lets a wine type stay as it is in the alcoholic fermentation', () => {
    expect(requiredCategories(phase(['MUST'], ['ACTIVE', 'SLOW', 'SUSPECTED_STOP', 'NONE']), 'RED', categories)).toBeNull()
  })
  it('asks for a wine category when a must moves to a phase open to any category', () => {
    expect(requiredCategories(phase([]), 'MUST', categories)?.map((item) => item.code)).toEqual(['RED', 'WHITE'])
  })
  it('needs nothing when the current category already fits', () => {
    expect(requiredCategories(phase(['MUST']), 'MUST', categories)).toBeNull()
    expect(requiredCategories(phase([]), 'RED', categories)).toBeNull()
  })
  it('needs nothing when going back to the automatic phase', () => {
    expect(requiredCategories(null, 'RED', categories)).toBeNull()
  })
})
