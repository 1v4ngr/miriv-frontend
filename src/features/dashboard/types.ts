import type { Axis, Mode, Period } from '../tracking/favorites'

export const DASHBOARD_SCHEMA_VERSION = 1

interface WidgetBase {
  id: string          // crypto.randomUUID()
  title: string
  /** When true the widget takes period / contents / category from the global filter bar. */
  followGlobal: boolean
}

export interface ChartWidget extends WidgetBase {
  type: 'chart'
  contents: string[]
  parameters: string[]
  period: Period
  mode: Mode              // 'overlay' = todo en un gráfico; 'grid' = un minigráfico por parámetro
  axis: Axis              // 'date' | 'days'
  showEvents: boolean
  showTargets: boolean
  showRate: boolean
  includeAncestors: boolean
  hiddenSeries: string[]  // nombres de serie ocultados desde la leyenda
}
export interface MatrixWidget extends WidgetBase { type: 'matrix'; parameters: string[]; onlyFlagged: boolean }
export interface KpiWidget extends WidgetBase { type: 'kpi'; content: string; parameter: string; sparklineDays: number }
export interface LatestTableWidget extends WidgetBase { type: 'latestTable'; contents: string[]; parameters: string[] }
export interface DateCompareWidget extends WidgetBase { type: 'dateCompare'; content: string; parameters: string[] }
export interface EventsWidget extends WidgetBase { type: 'events'; contents: string[]; period: Period; types: string[] }
export interface BlendShortcutWidget extends WidgetBase { type: 'blendShortcut' }

export type WidgetConfig = ChartWidget | MatrixWidget | KpiWidget | LatestTableWidget | DateCompareWidget | EventsWidget | BlendShortcutWidget
export type WidgetType = WidgetConfig['type']

export interface GridItem { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number }
export type Breakpoint = 'lg' | 'md' | 'sm'
export type Layouts = Partial<Record<Breakpoint, GridItem[]>>

export interface Dashboard {
  id: string
  name: string
  position: number
  isDefault: boolean
  schemaVersion: number
  layouts: Layouts
  widgets: WidgetConfig[]
  version: number
  updatedAt: string
}
export interface DashboardSummary { id: string; name: string; position: number; isDefault: boolean; updatedAt: string }

export interface GlobalFilters { period: Period; contents: string[]; category: string }
