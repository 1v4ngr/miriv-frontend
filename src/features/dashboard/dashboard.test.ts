import { describe, expect, it } from 'vitest'
import { defaultDashboard, newWidget, placeWidget } from './defaults'
import { normalizeDashboard } from './schema'

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
      expect(chart.mode).toBe('grid')
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
  it('builds the four-panel template with matching layout ids', () => {
    const { layouts, widgets } = defaultDashboard()
    expect(widgets).toHaveLength(4)
    expect(layouts.lg).toHaveLength(4)
    expect(new Set(layouts.lg?.map((item) => item.i))).toEqual(new Set(widgets.map((widget) => widget.id)))
  })

  it('places a new widget below the existing ones', () => {
    const first = newWidget('kpi')
    const second = newWidget('kpi')
    const layouts = placeWidget(placeWidget({}, first), second)
    const [a, b] = layouts.lg!
    expect(b.y).toBe(a.y + a.h)
    expect(layouts.md![1].w).toBeLessThanOrEqual(8)
  })
})
