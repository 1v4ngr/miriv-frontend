import { useEffect, useRef } from 'react'
import type { ECharts } from 'echarts'

/** Tiny axis-less line for KPI panels. `values` are [timestamp, value] pairs. */
export function Sparkline({ values, color = '#6d4656', height = 48, label }: { values: Array<[number, number]>; color?: string; height?: number; label: string }) {
  const host = useRef<HTMLDivElement>(null)
  const chart = useRef<ECharts | undefined>(undefined)

  useEffect(() => {
    if (!host.current) return
    let disposed = false
    const element = host.current
    void import('echarts').then((echarts) => {
      if (disposed) return
      chart.current = chart.current ?? echarts.init(element)
      chart.current.setOption({
        animation: false, grid: { left: 2, right: 2, top: 4, bottom: 4 },
        xAxis: { type: 'time', show: false }, yAxis: { type: 'value', show: false, scale: true },
        series: [{ type: 'line', data: values, showSymbol: values.length < 12, symbolSize: 4, smooth: false, lineStyle: { color, width: 2 }, itemStyle: { color } }],
      }, true)
    })
    return () => { disposed = true }
  }, [values, color])

  useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver(() => chart.current?.resize())
    observer.observe(element)
    return () => { observer.disconnect(); chart.current?.dispose(); chart.current = undefined }
  }, [])

  return <div ref={host} role="img" aria-label={label} style={{ height }} className="w-full" />
}
