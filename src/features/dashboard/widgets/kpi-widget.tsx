import { useMemo } from 'react'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { formatDateTime, formatNumber } from '../../../lib/format'
import { useResource } from '../../../hooks/use-resource'
import { ErrorState, LoadingState } from '../../../components/ui/page-state'
import { trackingApi, type SeriesResponse } from '../../tracking/services/tracking-api'
import { evaluateStatus, formatAge, formatPoint, plotValue, statusClass, statusLabel } from '../../tracking/utils'
import { Sparkline } from '../components/sparkline'
import { useDashboardContext } from '../dashboard-context'
import type { KpiWidget } from '../types'
import type { WidgetProps, WidgetSettingsProps } from './types'

const DAY_MS = 86_400_000
const EMPTY: SeriesResponse = { contents: [], parameters: [], points: [], targets: [] }
const select = 'rounded-xl border border-border bg-white px-2 py-1.5 text-xs font-normal text-copy'

/** The content this KPI reads: its own, or the focused one when it follows the global filters. */
const kpiContent = (widget: KpiWidget, globalContents: string[]) => (widget.followGlobal && globalContents.length === 1 ? globalContents[0] : widget.content)

export function KpiWidgetView({ widget, globals, openSettings }: WidgetProps<KpiWidget>) {
  const content = kpiContent(widget, globals.contents)
  const series = useResource(
    () => (content && widget.parameter
      ? trackingApi.series({ contents: [content], parameters: [widget.parameter], from: new Date(Date.now() - widget.sparklineDays * DAY_MS).toISOString() })
      : Promise.resolve(EMPTY)),
    [content, widget.parameter, widget.sparklineDays],
  )
  const data = series.data ?? EMPTY
  const points = useMemo(() => [...data.points].sort((a, b) => a.takenAt.localeCompare(b.takenAt)), [data.points])
  const sparkline = useMemo(() => points.flatMap((point) => { const y = plotValue(point); return y === null ? [] : [[new Date(point.takenAt).getTime(), y] as [number, number]] }), [points])

  if (!content) {
    return (
      <div className="p-3 text-center text-xs text-muted">
        <p>Elige depósito y parámetro.</p>
        <button type="button" onClick={openSettings} className="mt-1 font-semibold text-plum underline">Abrir ⚙ Ajustes</button>
      </div>
    )
  }
  if (series.loading) return <LoadingState label="Cargando…" />
  if (series.error) return <ErrorState message={series.error} onRetry={series.reload} />
  const parameter = data.parameters[0]
  const latest = points[points.length - 1]
  if (!parameter || !latest) return <p className="p-3 text-center text-xs text-muted">Sin analíticas de este parámetro en {widget.sparklineDays} días.</p>

  const status = evaluateStatus(latest, data.targets[0])
  const previous = points.length > 1 ? points[points.length - 2] : undefined
  const trend = previous && latest.qualifier === 'NONE' && previous.qualifier === 'NONE' && latest.value !== null && previous.value !== null
    ? (latest.value > previous.value ? 'UP' : latest.value < previous.value ? 'DOWN' : 'FLAT') : null
  const TrendIcon = trend === 'UP' ? ArrowUp : trend === 'DOWN' ? ArrowDown : Minus
  const age = Math.floor((Date.now() - new Date(latest.takenAt).getTime()) / DAY_MS)

  return (
    <div className="flex h-full flex-col justify-between p-3">
      <div>
        <p className="truncate text-[11px] text-muted">{content} · {parameter.name}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="font-mono text-[26px] font-semibold leading-none">{formatPoint(latest, parameter)}</span>
          <span className="text-xs text-muted">{parameter.unit}</span>
          {trend && <TrendIcon className="size-4 text-muted" aria-label={trend === 'UP' ? 'Sube' : trend === 'DOWN' ? 'Baja' : 'Estable'} />}
        </div>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
          <span className={`rounded-md px-1.5 py-0.5 font-semibold ${statusClass[status]}`}>{statusLabel[status]}</span>
          <span className="text-muted" title={formatDateTime(latest.takenAt)}>{formatAge(age)}{latest.validated ? '' : ' · sin validar'}</span>
        </p>
      </div>
      {sparkline.length > 1 && <Sparkline values={sparkline} label={`Evolución de ${parameter.name} en ${widget.sparklineDays} días`} />}
      {previous && previous.value !== null && latest.value !== null && <p className="text-[10.5px] text-muted">Antes: {formatNumber(previous.value, parameter.decimals)}</p>}
    </div>
  )
}

export function KpiWidgetSettings({ widget, onChange }: WidgetSettingsProps<KpiWidget>) {
  const { overview } = useDashboardContext()
  const parameters = useResource(() => trackingApi.parameters(), [])
  return (
    <div className="space-y-4">
      <label className="grid gap-1 font-semibold text-muted">Depósito / contenido
        <select value={widget.content} onChange={(event) => onChange({ ...widget, content: event.target.value })} className={select}>
          <option value="">Elegir…</option>
          {(overview?.rows ?? []).map((row) => <option key={row.content} value={row.content}>{row.deposit} · {row.content}</option>)}
          {widget.content && !(overview?.rows ?? []).some((row) => row.content === widget.content) && <option value={widget.content}>{widget.content}</option>}
        </select>
      </label>
      <label className="grid gap-1 font-semibold text-muted">Parámetro
        <select value={widget.parameter} onChange={(event) => onChange({ ...widget, parameter: event.target.value })} className={select}>
          {(parameters.data ?? []).map((parameter) => <option key={parameter.code} value={parameter.code}>{parameter.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 font-semibold text-muted">Minigráfico de los últimos
        <select value={widget.sparklineDays} onChange={(event) => onChange({ ...widget, sparklineDays: Number(event.target.value) })} className={select}>
          {[7, 14, 30, 60, 90].map((days) => <option key={days} value={days}>{days} días</option>)}
        </select>
      </label>
      <p className="text-[11px] text-muted">Con «Seguir filtros globales» y un único depósito enfocado, el indicador muestra ese depósito.</p>
    </div>
  )
}
