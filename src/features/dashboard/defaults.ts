import type { Breakpoint, Layouts, WidgetConfig, WidgetType } from './types'

export interface CatalogEntry {
  type: WidgetType
  label: string
  description: string
  size: { w: number; h: number; minW: number; minH: number }
}

export const WIDGET_CATALOG: CatalogEntry[] = [
  { type: 'chart', label: 'Gráfico de evolución', description: 'Uno o varios depósitos y parámetros en el tiempo', size: { w: 6, h: 8, minW: 3, minH: 5 } },
  { type: 'matrix', label: 'Estado de la bodega', description: 'Matriz semáforo de depósitos', size: { w: 12, h: 8, minW: 6, minH: 5 } },
  { type: 'kpi', label: 'Indicador', description: 'Último valor de un parámetro con tendencia', size: { w: 3, h: 4, minW: 2, minH: 3 } },
  { type: 'latestTable', label: 'Última analítica', description: 'Tabla comparativa de depósitos', size: { w: 6, h: 6, minW: 4, minH: 4 } },
  { type: 'dateCompare', label: 'Comparar dos análisis', description: 'Dos fechas de un mismo contenido', size: { w: 6, h: 6, minW: 4, minH: 4 } },
  { type: 'events', label: 'Eventos', description: 'Trasiegos, operaciones y revisiones', size: { w: 4, h: 6, minW: 3, minH: 4 } },
  { type: 'blendShortcut', label: 'Simulador de mezclas', description: 'Acceso rápido al simulador', size: { w: 3, h: 4, minW: 2, minH: 3 } },
]

export const catalogEntry = (type: WidgetType): CatalogEntry => WIDGET_CATALOG.find((entry) => entry.type === type) ?? WIDGET_CATALOG[0]

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

/** A fresh widget with sensible defaults; `overrides` win over them. */
export function newWidget(type: WidgetType, overrides: Partial<WidgetConfig> = {}): WidgetConfig {
  const base = { id: newId(), title: catalogEntry(type).label, followGlobal: true }
  let widget: WidgetConfig
  switch (type) {
    case 'chart':
      widget = { ...base, type, contents: [], parameters: ['DENSITY'], period: '30', mode: 'grid', axis: 'date', showEvents: true, showTargets: true, showRate: false, includeAncestors: false, hiddenSeries: [] }
      break
    case 'matrix':
      widget = { ...base, type, parameters: [], onlyFlagged: false }
      break
    case 'kpi':
      widget = { ...base, type, content: '', parameter: 'DENSITY', sparklineDays: 30 }
      break
    case 'latestTable':
      widget = { ...base, type, contents: [], parameters: ['DENSITY', 'VOLATILE_ACIDITY', 'PH', 'FREE_SO2'] }
      break
    case 'dateCompare':
      widget = { ...base, type, content: '', parameters: ['DENSITY', 'VOLATILE_ACIDITY', 'PH', 'FREE_SO2', 'TOTAL_SO2'] }
      break
    case 'events':
      widget = { ...base, type, contents: [], period: '30', types: [] }
      break
    case 'blendShortcut':
      widget = { ...base, type }
      break
  }
  return { ...widget, ...overrides } as WidgetConfig
}

const BREAKPOINTS: Breakpoint[] = ['lg', 'md', 'sm']

const COLS: Record<Breakpoint, number> = { lg: 12, md: 8, sm: 1 }

/**
 * Adds the widget to every breakpoint: beside the last one when the row has room (so two half-width charts
 * sit side by side), otherwise at the bottom.
 */
export function placeWidget(layouts: Layouts, widget: WidgetConfig): Layouts {
  const { size } = catalogEntry(widget.type)
  const next: Layouts = {}
  for (const breakpoint of BREAKPOINTS) {
    const current = (layouts[breakpoint] ?? []).filter((item) => item.i !== widget.id)
    const cols = COLS[breakpoint]
    const width = breakpoint === 'sm' ? 1 : Math.min(size.w, cols)
    const bottom = current.reduce((max, item) => Math.max(max, item.y + item.h), 0)
    let x = 0
    let y = bottom
    const last = [...current].sort((a, b) => b.y - a.y || b.x - a.x)[0]
    if (last && last.x + last.w + width <= cols && last.y + last.h === bottom) { x = last.x + last.w; y = last.y }
    next[breakpoint] = [...current, {
      i: widget.id, x, y, w: width, h: size.h,
      minW: breakpoint === 'sm' ? 1 : Math.min(size.minW, width), minH: size.minH,
    }]
  }
  return next
}

export function removeFromLayouts(layouts: Layouts, id: string): Layouts {
  const next: Layouts = {}
  for (const breakpoint of BREAKPOINTS) if (layouts[breakpoint]) next[breakpoint] = layouts[breakpoint]!.filter((item) => item.i !== id)
  return next
}

/** First-use template: overview matrix, density curves, acidity + pH and the blend shortcut. */
export function defaultDashboard(): { layouts: Layouts; widgets: WidgetConfig[] } {
  const widgets: WidgetConfig[] = [
    newWidget('matrix', { title: 'Estado de la bodega' }),
    newWidget('chart', { title: 'Densidad (fermentaciones)', parameters: ['DENSITY'], axis: 'days', showRate: true }),
    newWidget('chart', { title: 'Acidez volátil y pH', parameters: ['VOLATILE_ACIDITY', 'PH'], mode: 'grid' }),
    newWidget('blendShortcut'),
  ]
  const layouts = widgets.reduce<Layouts>((acc, widget) => placeWidget(acc, widget), {})
  return { layouts, widgets }
}
