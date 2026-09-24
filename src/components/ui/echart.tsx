import { useEffect, useRef, type CSSProperties } from 'react'
import type { ECharts, EChartsOption } from 'echarts'

/**
 * Thin wrapper over ECharts for small, self-contained visuals (gauges, sparklines). ECharts is loaded
 * lazily, the chart follows its box size and is disposed on unmount.
 */
export function EChart({ option, className, label, style }: { option: EChartsOption; className?: string; label: string; style?: CSSProperties }) {
  const host = useRef<HTMLDivElement>(null)
  const chart = useRef<ECharts | undefined>(undefined)

  useEffect(() => {
    const element = host.current
    if (!element) return
    let disposed = false
    void import('echarts').then((echarts) => {
      if (disposed) return
      chart.current ??= echarts.init(element, undefined, { renderer: 'svg' })
      // Charts speak the app's typeface unless an option says otherwise.
      chart.current.setOption({ textStyle: { fontFamily: getComputedStyle(element).fontFamily }, ...option }, true)
    })
    return () => { disposed = true }
  }, [option])

  useEffect(() => {
    const element = host.current
    if (!element) return
    const observer = new ResizeObserver(() => chart.current?.resize())
    observer.observe(element)
    return () => { observer.disconnect(); chart.current?.dispose(); chart.current = undefined }
  }, [])

  return <div ref={host} role="img" aria-label={label} className={className} style={style} />
}
