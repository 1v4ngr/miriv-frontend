import { AlertsWidgetSettings, AlertsWidgetView } from './alerts-widget'
import { BlendShortcutView } from './blend-shortcut-widget'
import { ChartWidgetSettings, ChartWidgetView } from './chart-widget'
import { EventsWidgetSettings, EventsWidgetView } from './events-widget'
import { KpiWidgetSettings, KpiWidgetView } from './kpi-widget'
import { MatrixWidgetSettings, MatrixWidgetView } from './matrix-widget'
import { DateCompareWidgetSettings, DateCompareWidgetView, LatestTableWidgetSettings, LatestTableWidgetView } from './tables-widgets'
import type { WidgetRegistry } from './types'

const NoSettings = () => null

/** One entry per WidgetType: the panel body and its settings form. */
export const WIDGETS: WidgetRegistry = {
  chart: { View: ChartWidgetView, Settings: ChartWidgetSettings },
  matrix: { View: MatrixWidgetView, Settings: MatrixWidgetSettings },
  kpi: { View: KpiWidgetView, Settings: KpiWidgetSettings },
  latestTable: { View: LatestTableWidgetView, Settings: LatestTableWidgetSettings },
  dateCompare: { View: DateCompareWidgetView, Settings: DateCompareWidgetSettings },
  events: { View: EventsWidgetView, Settings: EventsWidgetSettings },
  blendShortcut: { View: BlendShortcutView, Settings: NoSettings },
  alerts: { View: AlertsWidgetView, Settings: AlertsWidgetSettings },
}
