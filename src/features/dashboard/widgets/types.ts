import type { ComponentType } from 'react'
import type { GlobalFilters, WidgetConfig, WidgetType } from '../types'

export interface WidgetProps<W extends WidgetConfig = WidgetConfig> {
  widget: W
  onChange: (next: W) => void
  globals: GlobalFilters
  onNavigate: (path: string) => void
  /** Opens this widget's settings drawer (used by empty states: "Elige depósitos en ⚙"). */
  openSettings: () => void
}

export interface WidgetSettingsProps<W extends WidgetConfig = WidgetConfig> {
  widget: W
  onChange: (next: W) => void
}

export interface WidgetDefinition<W extends WidgetConfig = WidgetConfig> {
  View: ComponentType<WidgetProps<W>>
  Settings: ComponentType<WidgetSettingsProps<W>>
}

export type WidgetRegistry = { [K in WidgetType]: WidgetDefinition<Extract<WidgetConfig, { type: K }>> }
