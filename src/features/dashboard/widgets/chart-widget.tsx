import { useMemo, useRef } from 'react'
import type { ECharts } from 'echarts'
import { Download, Image as ImageIcon } from 'lucide-react'
import { ErrorState, LoadingState } from '../../../components/ui/page-state'
import { useResource } from '../../../hooks/use-resource'
import { buildChartSeries } from '../../tracking/build-chart-series'
import { MultiSelect } from '../../tracking/components/multi-select'
import { downloadChartPng, SeriesChart, type ChartSeries } from '../../tracking/components/series-chart'
import { downloadCsv, seriesToCsv } from '../../tracking/export'
import type { Axis, Mode, Period } from '../../tracking/favorites'
import { PERIODS, periodStart } from '../../tracking/period'
import { trackingApi, type SeriesResponse } from '../../tracking/services/tracking-api'
import { useDashboardContext } from '../dashboard-context'
import { effectiveContents, effectivePeriod } from '../filters'
import { useElementSize } from '../hooks/use-element-size'
import type { ChartWidget } from '../types'
import type { WidgetProps, WidgetSettingsProps } from './types'

const EMPTY: SeriesResponse = { contents: [], parameters: [], points: [], targets: [] }
const MIN_HEIGHT = 200
const TOOLBAR_HEIGHT = 34
const select = 'rounded-xl border border-border bg-white px-2 py-1.5 text-xs font-normal text-copy'

/** Evolution chart(s) with the panel's own filters (or the global ones). */
export function ChartWidgetView({ widget, onChange, globals, onNavigate, openSettings }: WidgetProps<ChartWidget>) {
  const { overview } = useDashboardContext()
  const contents = effectiveContents(widget.contents, widget.followGlobal, globals, overview)
  const period = effectivePeriod(widget.period, widget.followGlobal, globals)
  const size = useElementSize<HTMLDivElement>()
  const charts = useRef(new Map<string, ECharts>())

  const series = useResource(
    () => (contents.length && widget.parameters.length
      ? trackingApi.series({ contents, parameters: widget.parameters, from: periodStart(period), includeAncestors: widget.includeAncestors })
      : Promise.resolve(EMPTY)),
    [contents.join(','), widget.parameters.join(','), period, widget.includeAncestors],
  )
  const data = series.data ?? EMPTY
  const codes = data.contents.map((content) => content.code)
  const events = useResource(
    () => (widget.showEvents && codes.length ? trackingApi.events(codes, periodStart(period)) : Promise.resolve([])),
    [codes.join(','), widget.showEvents, period],
  )
  const chartSeries = useMemo<ChartSeries[]>(() => buildChartSeries(data), [data])
  const eventList = events.data ?? []
  const distinctUnits = new Set(data.parameters.map((parameter) => parameter.unit ?? '')).size
  const mode: Mode = widget.mode === 'overlay' && distinctUnits <= 2 ? 'overlay' : 'grid'
  const setHidden = (hiddenSeries: string[]) => onChange({ ...widget, hiddenSeries })

  if (contents.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-muted">
        <p>Elige depósitos para ver su evolución.</p>
        <button type="button" onClick={openSettings} className="mt-2 font-semibold text-plum underline">Elegir en ⚙ Ajustes</button>
      </div>
    )
  }
  if (series.loading) return <LoadingState label="Cargando…" />
  if (series.error) return <ErrorState message={series.error} onRetry={series.reload} />
  if (data.points.length === 0) return <p className="p-4 text-center text-xs text-muted">Sin analíticas en este periodo para lo elegido.</p>

  const overlayHeight = Math.max(MIN_HEIGHT, size.height - TOOLBAR_HEIGHT)
  return (
    <div ref={size.ref} className="flex h-full flex-col">
      {widget.mode === 'overlay' && mode === 'grid' && <p role="status" className="mx-3 mt-2 rounded-lg bg-[#f5eed0] p-1.5 text-[11px] text-[#6b5a10]">Superponer admite 2 unidades como máximo: se muestra un gráfico por parámetro.</p>}
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {mode === 'overlay' ? (
          <SeriesChart series={chartSeries} axis={widget.axis} events={eventList} showTargets={widget.showTargets} showRate={false}
            height={overlayHeight} label={`Evolución de ${data.parameters.map((parameter) => parameter.name).join(', ')}`}
            hiddenSeries={widget.hiddenSeries} onLegendChange={setHidden} onReady={(chart) => charts.current.set('overlay', chart)} />
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
            {data.parameters.map((parameter) => {
              const own = chartSeries.filter((item) => item.parameter.code === parameter.code)
              return (
                <div key={parameter.code} className="rounded-xl border border-border p-2">
                  <div className="flex items-center justify-between px-1">
                    <h4 className="text-xs font-semibold">{parameter.name}<span className="ml-1 font-normal text-muted">{parameter.unit}</span></h4>
                    <button type="button" aria-label={`Descargar ${parameter.name} como imagen`} onClick={() => { const chart = charts.current.get(parameter.code); if (chart) downloadChartPng(chart, `${parameter.code}.png`) }} className="widget-no-drag text-muted hover:text-plum"><ImageIcon className="size-3.5" /></button>
                  </div>
                  {own.some((item) => item.points.length > 0)
                    ? <SeriesChart series={own} axis={widget.axis} events={eventList} showTargets={widget.showTargets} showRate={widget.showRate}
                        height={220} label={`Evolución de ${parameter.name}`} hiddenSeries={widget.hiddenSeries} onLegendChange={setHidden}
                        onReady={(chart) => charts.current.set(parameter.code, chart)} />
                    : <p className="py-8 text-center text-xs text-muted">Sin datos de este parámetro.</p>}
                </div>
              )
            })}
          </div>
        )}
      </div>
      <footer className="flex h-[34px] shrink-0 items-center gap-3 border-t border-border px-3 text-[11px] text-muted">
        <span>{data.points.length} puntos · {data.contents.filter((content) => !content.ancestor).length} depósito(s)</span>
        <button type="button" onClick={() => downloadCsv(`${widget.title}.csv`, seriesToCsv(data))} className="widget-no-drag ml-auto flex items-center gap-1 font-semibold text-plum"><Download className="size-3.5" />CSV</button>
        {mode === 'overlay' && <button type="button" onClick={() => { const chart = charts.current.get('overlay'); if (chart) downloadChartPng(chart, `${widget.title}.png`) }} className="widget-no-drag flex items-center gap-1 font-semibold text-plum"><ImageIcon className="size-3.5" />PNG</button>}
        <button type="button" onClick={() => onNavigate(`tracking/compare?c=${contents.join(',')}&p=${widget.parameters.join(',')}&per=${period}&mode=${widget.mode}&axis=${widget.axis}`)} className="widget-no-drag font-semibold text-plum">Abrir en el comparador</button>
      </footer>
    </div>
  )
}

export function ChartWidgetSettings({ widget, onChange }: WidgetSettingsProps<ChartWidget>) {
  const { overview, globals } = useDashboardContext()
  const parameters = useResource(() => trackingApi.parameters(), [])
  const globalContents = widget.followGlobal && globals.contents.length > 0
  const contentOptions = (overview?.rows ?? []).map((row) => ({ value: row.content, label: `${row.deposit} · ${row.content}`, hint: row.category ?? undefined }))
  for (const code of widget.contents) if (!contentOptions.some((option) => option.value === code)) contentOptions.push({ value: code, label: code, hint: undefined })
  const set = <K extends keyof ChartWidget>(key: K, value: ChartWidget[K]) => onChange({ ...widget, [key]: value })

  return (
    <div className="space-y-4">
      {globalContents
        ? <p className="rounded-xl bg-plum-soft p-2 text-[11.5px] text-plum">Usando los depósitos globales. Desactiva «Seguir filtros globales» para elegir otros.</p>
        : <MultiSelect label="Depósitos / contenidos" options={contentOptions} selected={widget.contents} onChange={(value) => set('contents', value)} placeholder="Elige uno o varios" max={40} />}
      <MultiSelect label="Parámetros" options={(parameters.data ?? []).map((parameter) => ({ value: parameter.code, label: parameter.name, hint: parameter.unit ?? undefined }))}
        selected={widget.parameters} onChange={(value) => set('parameters', value)} placeholder="Elige parámetros" bulk max={30} />
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1 font-semibold text-muted">Periodo
          <select value={widget.period} disabled={widget.followGlobal} onChange={(event) => set('period', event.target.value as Period)} className={select}>{PERIODS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </label>
        <label className="grid gap-1 font-semibold text-muted">Eje horizontal
          <select value={widget.axis} onChange={(event) => set('axis', event.target.value as Axis)} className={select}><option value="date">Fecha</option><option value="days">Días desde el inicio</option></select>
        </label>
      </div>
      <label className="grid gap-1 font-semibold text-muted">Vista
        <select value={widget.mode} onChange={(event) => set('mode', event.target.value as Mode)} className={select}><option value="grid">Un gráfico por parámetro</option><option value="overlay">Superponer en un gráfico</option></select>
      </label>
      <div className="grid gap-2">
        <label className="flex items-center gap-2"><input type="checkbox" checked={widget.showEvents} onChange={(event) => set('showEvents', event.target.checked)} className="size-3.5 accent-plum" />Anotar trasiegos, operaciones y revisiones</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={widget.showTargets} onChange={(event) => set('showTargets', event.target.checked)} className="size-3.5 accent-plum" />Mostrar objetivos (aviso / crítico)</label>
        <label className={`flex items-center gap-2 ${widget.mode === 'grid' ? '' : 'opacity-50'}`}><input type="checkbox" disabled={widget.mode !== 'grid'} checked={widget.showRate} onChange={(event) => set('showRate', event.target.checked)} className="size-3.5 accent-plum" />Velocidad de cambio (Δ/día)</label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={widget.includeAncestors} onChange={(event) => set('includeAncestors', event.target.checked)} className="size-3.5 accent-plum" />Incluir origen (contenidos de los que procede)</label>
      </div>
      {widget.hiddenSeries.length > 0 && <button type="button" onClick={() => set('hiddenSeries', [])} className="font-semibold text-plum underline">Mostrar las {widget.hiddenSeries.length} serie(s) ocultas</button>}
    </div>
  )
}
