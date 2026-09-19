import { describe, expect, it } from 'vitest'
import { defaultDashboard, newWidget, placeWidget } from './defaults'
import { normalizeDashboard } from './schema'
import { effectiveContents, effectivePeriod } from './filters'

describe('normalizeDashboard', () => {
  it('never throws on garbage and opens empty', () => {
    expect(normalizeDashboard(null).widgets).toEqual([])
    expect(normalizeDashboard({ widgets: 'x', layouts: 5 }).widgets).toEqual([])
    expect(normalizeDashboard('nope').name).toBe('Mi seguimiento')
  })

  it('fills missing fields with defaults, keeps the stored ones and places the widget', () => {
    const dashboard = normalizeDashboard({ id: 'd', widgets: [{ id: 'a', type: 'chart', title: 'T' }] })
    const chart = dashboard.widgets[0]
    expect(chart.type).toBe('chart')
    if (chart.type === 'chart') {
      expect(chart.mode).toBe('overlay')
      expect(chart.period).toBe('30')
    }
    expect(chart.title).toBe('T')
    expect(dashboard.layouts.lg?.some((item) => item.i === 'a')).toBe(true)
    expect(dashboard.layouts.sm?.[0].w).toBe(1)
  })

  it('drops unknown widget types, duplicates and orphan layout items', () => {
    const dashboard = normalizeDashboard({
      widgets: [{ id: 'a', type: 'foo' }, { id: 'b', type: 'kpi' }, { id: 'b', type: 'kpi' }],
      layouts: { lg: [{ i: 'ghost', x: 0, y: 0, w: 1, h: 1 }, { i: 'b', x: 2, y: 3, w: 4, h: 5 }] },
    })
    expect(dashboard.widgets.map((widget) => widget.id)).toEqual(['b'])
    expect(dashboard.layouts.lg).toEqual([{ i: 'b', x: 2, y: 3, w: 4, h: 5 }])
  })
})

describe('defaults', () => {
  it('builds the five-panel template with matching layout ids', () => {
    const { layouts, widgets } = defaultDashboard()
    expect(widgets).toHaveLength(5)
    expect(layouts.lg).toHaveLength(5)
    expect(new Set(layouts.lg?.map((item) => item.i))).toEqual(new Set(widgets.map((widget) => widget.id)))
  })

  it('places a widget beside the last one when the row has room, else below', () => {
    const first = newWidget('chart')
    const second = newWidget('chart')
    const third = newWidget('chart')
    const layouts = placeWidget(placeWidget(placeWidget({}, first), second), third)
    const [a, b, c] = layouts.lg!
    expect(b.y).toBe(a.y)
    expect(b.x).toBe(a.x + a.w)                 // 6 + 6 = 12 columns: same row
    expect(c.x).toBe(0)
    expect(c.y).toBe(a.y + a.h)                 // the row is full: goes below
    expect(layouts.md![1].x).toBe(0)            // 8 columns: two 6-wide charts do not fit side by side
    expect(layouts.sm![1].x).toBe(0)
  })
})

describe('effective filters', () => {
  const overview = { parameters: [], rows: [
    { content: 'C-1', category: 'Tinto' }, { content: 'C-2', category: 'Blanco' }, { content: 'C-3', category: 'Tinto' },
  ] } as unknown as import('../tracking/services/tracking-api').OverviewResponse
  const globals = (patch: Partial<import('./types').GlobalFilters>) => ({ period: '30' as const, contents: [], category: '', ...patch })

  it('uses the own contents unless following the global ones', () => {
    expect(effectiveContents(['C-1'], false, globals({ contents: ['C-2'] }), overview)).toEqual(['C-1'])
    expect(effectiveContents(['C-1'], true, globals({ contents: ['C-2'] }), overview)).toEqual(['C-2'])
    expect(effectiveContents(['C-1'], true, globals({}), overview)).toEqual(['C-1'])
  })

  it('narrows by category, or selects the whole category when nothing is chosen', () => {
    expect(effectiveContents(['C-1', 'C-2'], true, globals({ category: 'Tinto' }), overview)).toEqual(['C-1'])
    expect(effectiveContents([], true, globals({ category: 'Tinto' }), overview)).toEqual(['C-1', 'C-3'])
  })

  it('takes the period from the globals only when following them', () => {
    expect(effectivePeriod('7', true, globals({ period: '90' }))).toBe('90')
    expect(effectivePeriod('7', false, globals({ period: '90' }))).toBe('7')
  })
})
