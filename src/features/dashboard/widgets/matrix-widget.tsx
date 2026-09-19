import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/page-state'
import { useResource } from '../../../hooks/use-resource'
import { MultiSelect } from '../../tracking/components/multi-select'
import { MatrixLegend, OverviewMatrix } from '../../tracking/components/overview-matrix'
import { trackingApi } from '../../tracking/services/tracking-api'
import { useDashboardContext } from '../dashboard-context'
import type { MatrixWidget } from '../types'
import type { WidgetProps, WidgetSettingsProps } from './types'

/** Status matrix. Clicking a row focuses that tank in every panel that follows the global filters. */
export function MatrixWidgetView({ widget, globals }: WidgetProps<MatrixWidget>) {
  const { focus } = useDashboardContext()
  const overview = useResource(() => trackingApi.overview(widget.parameters.length ? widget.parameters : undefined), [widget.parameters.join(',')])
  if (overview.loading) return <LoadingState label="Cargando…" />
  if (overview.error) return <ErrorState message={overview.error} onRetry={overview.reload} />
  const rows = (overview.data?.rows ?? []).filter((row) => {
    if (widget.followGlobal && globals.category && row.category !== globals.category) return false
    return !widget.onlyFlagged || row.worstStatus === 'WARN' || row.worstStatus === 'CRIT'
  })
  if (rows.length === 0) return <div className="p-3"><EmptyState label={widget.onlyFlagged ? 'Ningún depósito con aviso o crítico.' : 'No hay depósitos ocupados.'} /></div>
  return (
    <div className="space-y-2 p-2">
      <OverviewMatrix rows={rows} parameters={overview.data?.parameters ?? []} onOpenRow={focus} />
      <MatrixLegend />
    </div>
  )
}

export function MatrixWidgetSettings({ widget, onChange }: WidgetSettingsProps<MatrixWidget>) {
  const parameters = useResource(() => trackingApi.parameters(), [])
  return (
    <div className="space-y-4">
      <MultiSelect label="Parámetros en la matriz (vacío = los habituales)" options={(parameters.data ?? []).map((parameter) => ({ value: parameter.code, label: parameter.name, hint: parameter.unit ?? undefined }))}
        selected={widget.parameters} onChange={(value) => onChange({ ...widget, parameters: value })} bulk max={12} />
      <label className="flex items-center gap-2"><input type="checkbox" checked={widget.onlyFlagged} onChange={(event) => onChange({ ...widget, onlyFlagged: event.target.checked })} className="size-3.5 accent-plum" />Solo depósitos con aviso o crítico</label>
    </div>
  )
}
