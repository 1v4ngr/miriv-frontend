import { useEffect, useRef } from 'react'
import type { ECharts, EChartsOption } from 'echarts'
import { formatDateTime, formatNumber } from '../../../lib/format'
import type { ContentInfo, ParameterInfo, SeriesPoint, TargetRange, TrackingEvent } from '../services/tracking-api'
import { daysBetween, formatPoint, plotValue } from '../utils'

export interface ChartSeries {
  content: ContentInfo
  parameter: ParameterInfo
  points: SeriesPoint[]
  color: string
  target?: TargetRange
}

export type TimeAxis = 'date' | 'days'

interface Props {
  series: ChartSeries[]
  axis: TimeAxis
  events: TrackingEvent[]
  showTargets: boolean
  /** Adds bars with the change per day (fermentation speed). Ignored when the chart mixes two units. */
  showRate: boolean
  height?: number
  label: string
}

const DAY_MS = 86_400_000
const SYMBOLS = ['circle', 'rect', 'triangle', 'diamond', 'pin', 'arrow']
const WARN_COLOR = '#c0902a'
const CRIT_COLOR = '#b3263f'
const EVENT_COLORS: Record<string, string> = {
  TRANSFER: '#2e7d9a', ENTRY: '#4d8b4f', MIX: '#8e4fa8', SPLIT: '#8e4fa8', EXIT: '#4a5568', LOSS: '#b8423f',
  ADJUSTMENT: '#8a8f2a', OPERATION: '#c0782a', STATE_REVIEW: '#6d4656',
}
/** Above this many events the labels are dropped (only lines + hover) to keep the chart readable. */
const MAX_LABELLED_EVENTS = 10

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)

interface PointDatum { value: [number, number]; meta: SeriesPoint; series: ChartSeries }
interface RateDatum { value: [number, number]; rate: number; series: ChartSeries }

export function SeriesChart({ series, axis, events, showTargets, showRate, height = 340, label }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const chartRef = useRef<ECharts | undefined>(undefined)

  useEffect(() => {
    if (!host.current) return
    let disposed = false
    const element = host.current
    void import('echarts').then((echarts) => {
      if (disposed) return
      const chart = chartRef.current ?? echarts.init(element)
      chartRef.current = chart
      chart.setOption(buildOption(series, axis, events, showTargets, showRate), true)
    })
    return () => { disposed = true }
  }, [series, axis, events, showTargets, showRate])

  useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver(() => chartRef.current?.resize())
    observer.observe(element)
    return () => { observer.disconnect(); chartRef.current?.dispose(); chartRef.current = undefined }
  }, [])

  return <div ref={host} role="img" aria-label={label} style={{ height }} className="w-full" />
}

function buildOption(series: ChartSeries[], axis: TimeAxis, events: TrackingEvent[], showTargets: boolean, showRate: boolean): EChartsOption {
  const startOf = (code: string) => series.find((item) => item.content.code === code)?.content.startedAt ?? null
  const xOf = (code: string, iso: string) => (axis === 'date' ? new Date(iso).getTime() : daysBetween(startOf(code), iso))

  const units = [...new Set(series.map((item) => item.parameter.unit ?? ''))]
  const twoUnits = units.length > 1
  const rateOn = showRate && !twoUnits
  const parameterCodes = [...new Set(series.map((item) => item.parameter.code))]
  const manyParameters = parameterCodes.length > 1
  const manyContents = new Set(series.map((item) => item.content.code)).size > 1

  const seenTargetFor = new Set<string>()
  const lines = series.map((item) => {
    const yAxisIndex = Math.min(units.indexOf(item.parameter.unit ?? ''), 1)
    const data: PointDatum[] = item.points
      .map((point) => ({ point, y: plotValue(point) }))
      .filter((entry): entry is { point: SeriesPoint; y: number } => entry.y !== null)
      .map(({ point, y }) => ({ value: [xOf(item.content.code, point.takenAt), y] as [number, number], meta: point, series: item }))
      .sort((a, b) => a.value[0] - b.value[0])

    const targetLines: Array<Record<string, unknown>> = []
    if (showTargets && item.target && !seenTargetFor.has(item.parameter.code)) {
      seenTargetFor.add(item.parameter.code)
      const add = (value: number | null, kind: string, color: string) => {
        if (value !== null) targetLines.push({ yAxis: value, lineStyle: { color, type: 'dashed', width: 1.2 }, label: { formatter: `${kind} ${formatNumber(value, item.parameter.decimals)}`, color, position: 'insideEndTop', fontSize: 10 } })
      }
      add(item.target.warnMin, 'aviso mín.', WARN_COLOR); add(item.target.warnMax, 'aviso máx.', WARN_COLOR)
      add(item.target.critMin, 'crítico mín.', CRIT_COLOR); add(item.target.critMax, 'crítico máx.', CRIT_COLOR)
    }

    const name = [item.content.code, manyParameters ? item.parameter.name : ''].filter(Boolean).join(' · ')
    const symbolIndex = parameterCodes.indexOf(item.parameter.code)
    return {
      name,
      type: 'line' as const,
      yAxisIndex,
      connectNulls: false,
      symbol: SYMBOLS[symbolIndex % SYMBOLS.length],
      symbolSize: 8,
      lineStyle: { color: item.color, width: 2, type: item.content.ancestor ? ('dashed' as const) : ('solid' as const) },
      itemStyle: { color: item.color },
      data: data.map((datum) => datum.meta.qualifier === 'NONE' ? datum : { ...datum, symbol: 'emptyDiamond', symbolSize: 10 }),
      markLine: targetLines.length ? { silent: true, symbol: 'none', data: targetLines } : undefined,
    }
  })

  const rates = rateOn ? series.flatMap((item) => {
    const numeric = item.points.filter((point) => point.qualifier === 'NONE' && point.value !== null)
      .sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime())
    const data: RateDatum[] = []
    for (let index = 1; index < numeric.length; index++) {
      const before = numeric[index - 1]; const after = numeric[index]
      const days = (new Date(after.takenAt).getTime() - new Date(before.takenAt).getTime()) / DAY_MS
      if (days <= 0) continue
      const midpoint = axis === 'date'
        ? (new Date(before.takenAt).getTime() + new Date(after.takenAt).getTime()) / 2
        : (xOf(item.content.code, before.takenAt) + xOf(item.content.code, after.takenAt)) / 2
      data.push({ value: [midpoint, ((after.value as number) - (before.value as number)) / days], rate: ((after.value as number) - (before.value as number)) / days, series: item })
    }
    return [{ name: `${item.content.code} · Δ/día`, type: 'bar' as const, yAxisIndex: 1, barMaxWidth: 10, itemStyle: { color: item.color, opacity: 0.28 }, data }]
  }) : []

  const labelled = events.length <= MAX_LABELLED_EVENTS
  const eventLines = events.map((event) => ({
    xAxis: xOf(event.content, event.at),
    name: `${escapeHtml(event.content)} · ${escapeHtml(event.label)}<br/>${formatDateTime(event.at)}<br/>${escapeHtml(event.detail)}`,
    lineStyle: { color: EVENT_COLORS[event.type] ?? '#6d4656', type: 'dotted' as const, width: 1.2 },
    label: labelled ? { show: true, formatter: event.label, rotate: 90, position: 'insideEndTop' as const, fontSize: 10, color: EVENT_COLORS[event.type] ?? '#6d4656' } : { show: false },
  }))
  const eventSeries = eventLines.length ? [{
    name: 'Eventos', type: 'line' as const, data: [], silent: false,
    markLine: { symbol: 'none', data: eventLines, tooltip: { formatter: (params: { name?: string }) => params.name ?? '' } },
  }] : []

  const yAxes = (twoUnits ? units.slice(0, 2) : [units[0] ?? '']).map((unit, index) => ({
    type: 'value' as const, scale: true, name: unit, position: index === 0 ? ('left' as const) : ('right' as const),
    splitLine: { show: index === 0, lineStyle: { color: '#eee7ea' } },
  }))
  if (rateOn) yAxes.push({ type: 'value' as const, scale: true, name: 'Δ/día', position: 'right' as const, splitLine: { show: false, lineStyle: { color: '#eee7ea' } } })

  return {
    grid: { left: 56, right: yAxes.length > 1 ? 56 : 24, top: 40, bottom: 56 },
    legend: { type: 'scroll', top: 0, data: [...lines.map((line) => line.name), ...rates.map((rate) => rate.name)], textStyle: { fontSize: 11 } },
    tooltip: {
      trigger: 'item',
      confine: true,
      formatter: (params: unknown) => {
        const datum = (params as { data?: PointDatum | RateDatum }).data
        if (datum && 'meta' in datum) {
          const { meta, series: source } = datum
          const value = formatPoint(meta, source.parameter)
          return `<b>${escapeHtml(source.content.code)}</b>${manyContents && source.content.deposit ? ` (${escapeHtml(source.content.deposit)})` : ''} · ${escapeHtml(source.parameter.name)}<br/>`
            + `<b>${escapeHtml(value)}</b> ${escapeHtml(source.parameter.unit ?? '')}<br/>${formatDateTime(meta.takenAt)}`
            + `${meta.validated ? '' : ' · sin validar'}<br/>Muestra ${escapeHtml(meta.sampleCode)}${meta.method ? ` · ${escapeHtml(meta.method)}` : ''}`
        }
        if (datum && 'rate' in datum) {
          return `<b>${escapeHtml(datum.series.content.code)}</b> · velocidad de cambio<br/>${formatNumber(datum.rate, datum.series.parameter.decimals + 1)} ${escapeHtml(datum.series.parameter.unit ?? '')}/día`
        }
        return ''
      },
    },
    xAxis: axis === 'date'
      ? { type: 'time', axisLabel: { fontSize: 11 } }
      : { type: 'value', name: 'días desde el inicio', nameLocation: 'middle', nameGap: 30, min: 0, axisLabel: { fontSize: 11 } },
    yAxis: yAxes,
    dataZoom: [{ type: 'inside', filterMode: 'none' }],
    series: [...lines, ...rates, ...eventSeries] as EChartsOption['series'],
  }
}
