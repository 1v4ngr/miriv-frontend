import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/page-state'
import { useResource } from '../../../hooks/use-resource'
import { DateComparison, LatestComparison } from '../../tracking/components/comparison-tables'
import { MultiSelect } from '../../tracking/components/multi-select'
import { DepositPicker } from '../components/deposit-picker'
import { trackingApi, type SeriesResponse } from '../../tracking/services/tracking-api'
import { useDashboardContext } from '../dashboard-context'
import { effectiveContents } from '../filters'
import type { DateCompareWidget, LatestTableWidget } from '../types'
import type { WidgetProps, WidgetSettingsProps } from './types'

const EMPTY: SeriesResponse = { contents: [], parameters: [], points: [], targets: [] }
const select = 'rounded-xl border border-border bg-white px-2 py-1.5 text-xs font-normal text-copy'

function useParameterOptions() {
  const parameters = useResource(() => trackingApi.parameters(), [])
  return (parameters.data ?? []).map((parameter) => ({ value: parameter.code, label: parameter.name, hint: parameter.unit ?? undefined }))
}

/** Whole-campaign series of some contents and parameters, for the two comparison tables. */
function useSeries(contents: string[], parameters: string[]) {
  return useResource(
    () => (contents.length && parameters.length ? trackingApi.series({ contents, parameters }) : Promise.resolve(EMPTY)),
    [contents.join(','), parameters.join(',')],
  )
}

export function LatestTableWidgetView({ widget, globals, onNavigate, openSettings }: WidgetProps<LatestTableWidget>) {
  const { overview } = useDashboardContext()
  const contents = effectiveContents(widget.contents, widget.followGlobal, globals, overview)
  const series = useSeries(contents, widget.parameters)
  if (contents.length === 0) return <ChooseHint text="Elige depósitos para compararlos." onClick={openSettings} />
  if (series.loading) return <LoadingState label="Cargando…" />
  if (series.error) return <ErrorState message={series.error} onRetry={series.reload} />
  const data = series.data ?? EMPTY
  if (data.points.length === 0) return <div className="p-3"><EmptyState label="Sin analíticas para lo elegido." /></div>
  return <div className="p-2"><LatestComparison series={data} onOpenContent={(code) => onNavigate(`contents/${encodeURIComponent(code)}`)} /></div>
}

export function LatestTableWidgetSettings({ widget, onChange }: WidgetSettingsProps<LatestTableWidget>) {
  const { overview } = useDashboardContext()
  const parameterOptions = useParameterOptions()
  return (
    <div className="space-y-4">
      <DepositPicker rows={overview?.rows ?? []} selected={widget.contents} onChange={(contents) => onChange({ ...widget, contents })} />
      <MultiSelect label="Parámetros" options={parameterOptions} selected={widget.parameters} onChange={(parameters) => onChange({ ...widget, parameters })} bulk max={30} />
    </div>
  )
}

export function DateCompareWidgetView({ widget, globals, openSettings }: WidgetProps<DateCompareWidget>) {
  const content = widget.followGlobal && globals.contents.length === 1 ? globals.contents[0] : widget.content
  const series = useSeries(content ? [content] : [], widget.parameters)
  if (!content) return <ChooseHint text="Elige un contenido para comparar dos de sus análisis." onClick={openSettings} />
  if (series.loading) return <LoadingState label="Cargando…" />
  if (series.error) return <ErrorState message={series.error} onRetry={series.reload} />
  return <div className="p-2"><DateComparison series={series.data ?? EMPTY} /></div>
}

export function DateCompareWidgetSettings({ widget, onChange }: WidgetSettingsProps<DateCompareWidget>) {
  const { overview } = useDashboardContext()
  const parameterOptions = useParameterOptions()
  return (
    <div className="space-y-4">
      <label className="grid gap-1 font-semibold text-muted">Contenido
        <select value={widget.content} onChange={(event) => onChange({ ...widget, content: event.target.value })} className={select}>
          <option value="">Elegir…</option>
          {(overview?.rows ?? []).map((row) => <option key={row.content} value={row.content}>{row.deposit} · {row.content}</option>)}
          {widget.content && !(overview?.rows ?? []).some((row) => row.content === widget.content) && <option value={widget.content}>{widget.content}</option>}
        </select>
      </label>
      <MultiSelect label="Parámetros" options={parameterOptions} selected={widget.parameters} onChange={(parameters) => onChange({ ...widget, parameters })} bulk max={30} />
    </div>
  )
}

function ChooseHint({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <div className="p-4 text-center text-xs text-muted">
      <p>{text}</p>
      <button type="button" onClick={onClick} className="mt-2 font-semibold text-plum underline">Abrir ⚙ Ajustes</button>
    </div>
  )
}
