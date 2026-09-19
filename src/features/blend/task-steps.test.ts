import { describe, expect, it } from 'vitest'
import { parseBlendSteps } from './task-steps'

const description = [
  '1. Trasegar 600 L de D-T1 (C-T1) → D-EMPTY (autorizar mezcla). Movimiento previsto MOV-2026-00007',
  '2. Trasegar 1000 L de D-T2 (C-2026-002) → D-EMPTY (autorizar mezcla). Movimiento previsto MOV-2026-00008',
  '3. Añadir metabisulfito potásico 5 g/hL en D-EMPTY tras la mezcla.',
  'Simulación BLEND:0f6f0b6e-3c1a-4c53-9d0b-1b1f2a9d7c11',
].join('\n')

describe('parseBlendSteps', () => {
  it('reads transfers with their planned movement, additions and the simulation id', () => {
    const parsed = parseBlendSteps(description)
    expect(parsed.blendId).toBe('0f6f0b6e-3c1a-4c53-9d0b-1b1f2a9d7c11')
    expect(parsed.steps).toEqual([
      { kind: 'transfer', step: 1, liters: 600, source: 'D-T1', content: 'C-T1', destination: 'D-EMPTY', movementCode: 'MOV-2026-00007' },
      { kind: 'transfer', step: 2, liters: 1000, source: 'D-T2', content: 'C-2026-002', destination: 'D-EMPTY', movementCode: 'MOV-2026-00008' },
      { kind: 'addition', step: 3, text: 'metabisulfito potásico 5 g/hL' },
    ])
  })

  it('accepts a transfer without a planned movement, ignores "…" and unrelated text', () => {
    const parsed = parseBlendSteps('Revisar antes\n1. Trasegar 50 L de D-1 (C-1) → D-2 (autorizar mezcla).\n…\n')
    expect(parsed.blendId).toBeNull()
    expect(parsed.steps).toEqual([{ kind: 'transfer', step: 1, liters: 50, source: 'D-1', content: 'C-1', destination: 'D-2', movementCode: null }])
  })

  it('returns nothing for a plain task', () => {
    expect(parseBlendSteps(undefined)).toEqual({ blendId: null, steps: [] })
    expect(parseBlendSteps('Tomar muestra de D-1')).toEqual({ blendId: null, steps: [] })
  })
})
