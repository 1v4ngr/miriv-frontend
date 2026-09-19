import { useEffect, useRef } from 'react'
import type { ECharts } from 'echarts'
import { formatNumber } from '../../../lib/format'
import { contentColors } from '../../tracking/utils'
import type { BlendResult, WineComponent } from '../types'

interface Props { components: WineComponent[]; result: BlendResult; parameters: string[] }

/**
 * Horizontal bars per parameter: one per tank and the blend result. Each parameter is normalised to its own
 * maximum (so pH and SO₂ can share the chart); the tooltip shows the real value.
 */
export function ResultChart({ components, result, parameters }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const chart = useRef<ECharts | undefined>(undefined)
  const wine = components.filter((component) => component.volumeLiters > 0)
  const rows = parameters
    .map((code) => result.parameters.find((item) => item.parameter.code === code))
    .filter((item): item is NonNullable<typeof item> => !!item && item.status === 'OK' && item.value !== null)

  useEffect(() => {
    if (!host.current || rows.length === 0) return
    let disposed = false
    const element = host.current
    void import('echarts').then((echarts) => {
      if (disposed) return
      chart.current = chart.current ?? echarts.init(element)
      const maxOf = (code: string, resultValue: number) => Math.max(resultValue, ...wine.map((component) => component.readings[code]?.value ?? 0)) || 1
      const bar = (name: string, color: string, valueOf: (code: string) => number | null, width: number) => ({
        name, type: 'bar' as const, barWidth: width, itemStyle: { color },
        data: rows.map((row) => {
          const real = valueOf(row.parameter.code)
          return { value: real === null ? 0 : (real / maxOf(row.parameter.code, row.value as number)) * 100, real, decimals: row.parameter.decimals, unit: row.parameter.unit }
        }),
      })
      chart.current.setOption({
        animation: false,
        grid: { left: 110, right: 24, top: 8, bottom: 74 },
        legend: { bottom: 0, textStyle: { fontSize: 11 }, type: 'scroll' },
        tooltip: {
          trigger: 'item', confine: true,
          formatter: (params: unknown) => {
            const p = params as { seriesName: string; name: string; data: { real: number | null; decimals: number; unit: string | null } }
            return `<b>${p.seriesName}</b> · ${p.name}<br/>${p.data.real === null ? '—' : formatNumber(p.data.real, p.data.decimals)} ${p.data.unit ?? ''}`
          },
        },
        xAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%', fontSize: 10 }, name: '% del máximo de cada parámetro', nameLocation: 'middle', nameGap: 26, nameTextStyle: { fontSize: 10 } },
        yAxis: { type: 'category', inverse: true, data: rows.map((row) => row.parameter.name), axisLabel: { fontSize: 11 } },
        series: [
          ...wine.map((component, index) => bar(component.label, contentColors[index % contentColors.length], (code) => component.readings[code]?.value ?? null, 8)),
          bar('Resultado', '#6d4656', (code) => result.parameters.find((item) => item.parameter.code === code)?.value ?? null, 14),
        ],
      }, true)
    })
    return () => { disposed = true }
  })

  useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver(() => chart.current?.resize())
    observer.observe(element)
    return () => { observer.disconnect(); chart.current?.dispose(); chart.current = undefined }
  }, [])

  if (rows.length === 0) return <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">Sin parámetros calculables para el gráfico.</p>
  const height = Math.max(240, rows.length * (wine.length + 1) * 12 + 120)
  return <div ref={host} role="img" aria-label="Comparación de los depósitos y del resultado" style={{ height }} className="w-full" />
}
