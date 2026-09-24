import { describe, expect, it } from 'vitest'
import { daysSince, matchesAnalysis } from './last-analysis'
import type { Deposit } from './types'

const daysAgo = (days: number) => { const date = new Date(); date.setDate(date.getDate() - days); date.setHours(10, 0, 0, 0); return date.toISOString() }
const deposit = (lastSampleAt: string | null | 'empty'): Deposit => ({
  id: 'd', code: 'D', center: 'C', zone: 'Exterior', position: '', capacityLiters: 1000, material: 'Inox', refrigerated: false, status: 'occupied', priority: 'none', cleaningHistory: [],
  occupations: lastSampleAt === 'empty' ? [] : [{ contentCode: 'C1', lotCode: 'L1', entryDate: daysAgo(30), volumeLiters: 500, category: 'Tinto', alcoholicState: '', malolacticState: '', lastSampleAt }],
})
const none = { from: '', to: '' }

describe('matchesAnalysis', () => {
  it('counts calendar days', () => {
    expect(daysSince(daysAgo(0))).toBe(0)
    expect(daysSince(daysAgo(3))).toBe(3)
  })
  it('filters today, the last 7 days and overdue ones', () => {
    expect(matchesAnalysis(deposit(daysAgo(0)), 'today', none)).toBe(true)
    expect(matchesAnalysis(deposit(daysAgo(1)), 'today', none)).toBe(false)
    expect(matchesAnalysis(deposit(daysAgo(7)), 'week', none)).toBe(true)
    expect(matchesAnalysis(deposit(daysAgo(8)), 'week', none)).toBe(false)
    expect(matchesAnalysis(deposit(daysAgo(8)), 'stale', none)).toBe(true)
  })
  it('treats never analysed as overdue and keeps empty deposits out', () => {
    expect(matchesAnalysis(deposit(null), 'never', none)).toBe(true)
    expect(matchesAnalysis(deposit(null), 'stale', none)).toBe(true)
    expect(matchesAnalysis(deposit('empty'), 'never', none)).toBe(false)
    expect(matchesAnalysis(deposit('empty'), '', none)).toBe(true)
  })
  it('filters by an inclusive date range, open at either end', () => {
    const iso = daysAgo(5)
    // Test instants are at 10:00 local time, so their local day is unambiguous.
    const local = new Date(iso); const ymd = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
    expect(matchesAnalysis(deposit(iso), 'range', { from: ymd, to: ymd })).toBe(true)
    expect(matchesAnalysis(deposit(iso), 'range', { from: ymd, to: '' })).toBe(true)
    expect(matchesAnalysis(deposit(daysAgo(10)), 'range', { from: ymd, to: '' })).toBe(false)
    expect(matchesAnalysis(deposit(null), 'range', { from: '', to: '' })).toBe(false)
  })
})
