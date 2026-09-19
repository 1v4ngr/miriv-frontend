import { DASHBOARD_SCHEMA_VERSION, type Breakpoint, type Dashboard, type GridItem, type Layouts, type WidgetConfig, type WidgetType } from './types'
import { newWidget, placeWidget, WIDGET_CATALOG } from './defaults'

const KNOWN_TYPES = new Set<string>(WIDGET_CATALOG.map((entry) => entry.type))
const BREAKPOINTS: Breakpoint[] = ['lg', 'md', 'sm']
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/**
 * Turns whatever the server stored into a valid Dashboard. It never throws: a corrupt or older
 * dashboard opens with what could be salvaged (possibly empty).
 */
export function normalizeDashboard(raw: unknown): Dashboard {
  const source = isObject(raw) ? raw : {}
  const widgets: WidgetConfig[] = []
  const seen = new Set<string>()
  for (const item of Array.isArray(source.widgets) ? source.widgets : []) {
    if (!isObject(item) || typeof item.type !== 'string' || !KNOWN_TYPES.has(item.type)) continue
    if (typeof item.id !== 'string' || !item.id || seen.has(item.id)) continue
    seen.add(item.id)
    // Defaults first, then what was stored, so new fields appear without losing the user's choices.
    widgets.push({ ...newWidget(item.type as WidgetType), ...(item as object), type: item.type } as WidgetConfig)
  }

  const rawLayouts = isObject(source.layouts) ? source.layouts : {}
  let layouts: Layouts = {}
  for (const breakpoint of BREAKPOINTS) {
    const items = Array.isArray(rawLayouts[breakpoint]) ? (rawLayouts[breakpoint] as unknown[]) : []
    layouts[breakpoint] = items
      .filter((item): item is Record<string, unknown> => isObject(item) && typeof item.i === 'string' && seen.has(item.i as string))
      .filter((item) => isNumber(item.x) && isNumber(item.y) && isNumber(item.w) && isNumber(item.h))
      .map((item): GridItem => {
        const entry: GridItem = { i: item.i as string, x: item.x as number, y: item.y as number, w: item.w as number, h: item.h as number }
        if (isNumber(item.minW)) entry.minW = item.minW
        if (isNumber(item.minH)) entry.minH = item.minH
        return entry
      })
  }
  // A widget without a position in some breakpoint is appended there.
  for (const widget of widgets) {
    for (const breakpoint of BREAKPOINTS) {
      if (!layouts[breakpoint]!.some((item) => item.i === widget.id)) {
        const placed = placeWidget(layouts, widget)
        layouts = { ...layouts, [breakpoint]: placed[breakpoint] }
      }
    }
  }

  return {
    id: typeof source.id === 'string' ? source.id : '',
    name: typeof source.name === 'string' ? source.name : 'Mi seguimiento',
    position: isNumber(source.position) ? source.position : 0,
    isDefault: source.isDefault === true,
    schemaVersion: DASHBOARD_SCHEMA_VERSION,
    layouts,
    widgets,
    version: isNumber(source.version) ? source.version : 0,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt : '',
  }
}
