import { describe, expect, it } from 'vitest'
import { formatDate, todayInCenter, nowTimeInCenter } from './format'

describe('format', () => {
  it('uses Madrid time for "today" just after midnight', () => {
    // 2026-09-17T22:30Z is 00:30 on 18 Sep in Madrid (UTC+2)
    expect(todayInCenter(new Date('2026-09-17T22:30:00Z'))).toBe('2026-09-18')
    expect(nowTimeInCenter(new Date('2026-09-17T22:30:00Z'))).toBe('00:30')
  })
  it('does not shift plain dates', () => {
    expect(formatDate('2026-09-16')).toContain('16')
  })
  it('returns the fallback for empty values', () => {
    expect(formatDate(undefined)).toBe('—')
  })
})