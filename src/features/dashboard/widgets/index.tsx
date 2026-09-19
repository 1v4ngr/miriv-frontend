import type { WidgetRegistry } from './types'

const Building = () => <p className="p-4 text-xs text-muted">Panel en construcción.</p>
const NoSettings = () => null

/** One entry per WidgetType; the real views/settings replace the placeholders in F6-06 and F6-08. */
export const WIDGETS: WidgetRegistry = {
  chart: { View: Building, Settings: NoSettings },
  matrix: { View: Building, Settings: NoSettings },
  kpi: { View: Building, Settings: NoSettings },
  latestTable: { View: Building, Settings: NoSettings },
  dateCompare: { View: Building, Settings: NoSettings },
  events: { View: Building, Settings: NoSettings },
  blendShortcut: { View: Building, Settings: NoSettings },
}
