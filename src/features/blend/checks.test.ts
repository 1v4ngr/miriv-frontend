import { describe, expect, it } from 'vitest'
import { blocksConversion, checkBlend, so2Limit, type Destination } from './checks'
import { simulateBlend } from './engine'
import type { Addition, ComponentReading, ParameterMeta, WineComponent } from './types'

const catalog: ParameterMeta[] = ['TOTAL_SO2', 'REDUCING_SUGARS', 'ETHANOL', 'PH', 'FREE_SO2'].map((code) => ({ code, name: code, unit: null, decimals: 2 }))
type ReadingSpec = number | Partial<ComponentReading>
function wine(depositCode: string, volumeLiters: number, patch: Partial<Omit<WineComponent, 'readings'>> & { readings?: Record<string, ReadingSpec> } = {}): WineComponent {
  const { readings: extra = {}, ...rest } = patch
  const specs: Record<string, ReadingSpec> = { ETHANOL: 13, ...extra }
  const readings: Record<string, ComponentReading> = Object.fromEntries(Object.entries(specs).map(([code, spec]) => [code, {
    value: 13, qualifier: 'NONE', limit: null, daysAgo: 0, validated: true, ...(typeof spec === 'number' ? { value: spec } : spec),
  } satisfies ComponentReading]))
  return { kind: 'wine', id: `C-${depositCode}`, label: depositCode, depositCode, categoryCode: 'RED', lotCode: 'L-1', availableLiters: 1000, volumeLiters, ...rest, readings }
}
const run = (components: WineComponent[], additions: Addition[] = [], destination: Destination | null = null) => {
  const result = simulateBlend(components, additions, catalog)
  return checkBlend(components, additions, destination, result)
}
const codes = (checks: ReturnType<typeof run>) => checks.map((check) => check.code)
const empty = (depositCode: string, usefulCapacityLiters: number | null): Destination => ({ depositCode, usefulCapacityLiters, status: 'available', occupiedByContent: null, occupiedLiters: null })

describe('checkBlend', () => {
  it('EMPTY blocks a blend without litres', () => {
    expect(codes(run([wine('A', 0)]))).toContain('EMPTY')
    expect(codes(run([wine('A', 100)]))).not.toContain('EMPTY')
  })

  it('VOLUME_EXCEEDS blocks asking for more than there is', () => {
    const checks = run([wine('A', 1200)])
    expect(checks.find((check) => check.code === 'VOLUME_EXCEEDS')?.message).toBe('A: pides 1200 L pero hay 1000 L.')
    expect(codes(run([wine('A', 900)]))).not.toContain('VOLUME_EXCEEDS')
  })

  it('NO_DESTINATION, DEST_IS_COMPONENT, DEST_OCCUPIED and CAPACITY_EXCEEDED', () => {
    expect(codes(run([wine('A', 100)]))).toContain('NO_DESTINATION')
    expect(codes(run([wine('A', 100)], [], empty('D-X', 5000)))).not.toContain('NO_DESTINATION')
    expect(codes(run([wine('A', 100)], [], empty('A', 5000)))).toContain('DEST_IS_COMPONENT')
    const occupied: Destination = { ...empty('D-X', 5000), status: 'occupied', occupiedByContent: 'C-9', occupiedLiters: 300 }
    expect(codes(run([wine('A', 100)], [], occupied))).toContain('DEST_OCCUPIED')
    expect(codes(run([wine('A', 100)], [], { ...occupied, depositCode: 'A' }))).not.toContain('DEST_OCCUPIED')
    expect(codes(run([wine('A', 600), wine('B', 600)], [], empty('D-X', 1000)))).toContain('CAPACITY_EXCEEDED')
    expect(codes(run([wine('A', 600), wine('B', 300)], [], empty('D-X', 1000)))).not.toContain('CAPACITY_EXCEEDED')
  })

  it('RED_WHITE warns about a rosé and MIX counts the lots', () => {
    expect(codes(run([wine('A', 100), wine('B', 100, { categoryCode: 'WHITE' })]))).toContain('RED_WHITE')
    expect(codes(run([wine('A', 100), wine('B', 100)]))).not.toContain('RED_WHITE')
    const mixed = run([wine('A', 100), wine('B', 100, { lotCode: 'L-2' })])
    expect(mixed.find((check) => check.code === 'MIX')?.message).toContain('2 lotes')
    expect(codes(run([wine('A', 100), wine('B', 100)]))).not.toContain('MIX')
  })

  it('WATER warns with the legal reference and blocks conversion', () => {
    const checks = run([wine('A', 100)], [{ id: 'w', type: 'WATER', amount: 10 }])
    const water = checks.find((check) => check.code === 'WATER')
    expect(water?.reference).toContain('1308/2013')
    expect(blocksConversion(checks)).toBe(true)
    expect(blocksConversion(run([wine('A', 100)], [], empty('D-X', 5000)))).toBe(false)
  })

  it('SO2_LIMIT compares total SO2 with the limit of the dominant colour', () => {
    const high = run([wine('A', 100, { readings: { TOTAL_SO2: 170 } })])
    expect(high.find((check) => check.code === 'SO2_LIMIT')?.message).toContain('150 mg/L para tinto')
    expect(codes(run([wine('A', 100, { readings: { TOTAL_SO2: 120 } })]))).not.toContain('SO2_LIMIT')
    expect(codes(run([wine('A', 100, { categoryCode: 'WHITE', readings: { TOTAL_SO2: 170 } })]))).not.toContain('SO2_LIMIT')
    expect(so2Limit('WHITE', 8)).toBe(250)
    expect(so2Limit('RED', 8)).toBe(200)
    expect(so2Limit('ROSE', 2)).toBe(200)
    expect(so2Limit('OTHER', 2)).toBeNull()
  })

  it('STALE and UNVALIDATED list the deposits', () => {
    const stale = run([wine('A', 100, { readings: { ETHANOL: { daysAgo: 10 } } })])
    expect(stale.find((check) => check.code === 'STALE')?.message).toContain('en A')
    expect(codes(run([wine('A', 100)]))).not.toContain('STALE')
    expect(codes(run([wine('A', 100, { readings: { ETHANOL: { validated: false } } })]))).toContain('UNVALIDATED')
    expect(codes(run([wine('A', 100)]))).not.toContain('UNVALIDATED')
  })

  it('ESTIMATES appears whenever there is a result', () => {
    expect(codes(run([wine('A', 100)]))).toContain('ESTIMATES')
    expect(codes(run([wine('A', 0)]))).not.toContain('ESTIMATES')
  })
})
