import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from '../../../../components/ui/echart'

/** Tiny trend line (last readings of one parameter). Nothing is drawn with fewer than two points. */
export function Sparkline({ values, color, label }: { values: number[]; color: string; label: string }) {
  const option = useMemo<EChartsOption>(() => ({
    animation: false,
    grid: { left: 1, right: 3, top: 3, bottom: 3 },
    xAxis: { type: 'category', show: false, boundaryGap: false, data: values.map((_, index) => index) },
    yAxis: { type: 'value', show: false, scale: true },
    series: [{ type: 'line', data: values, smooth: 0.3, showSymbol: false, silent: true, lineStyle: { width: 1.5, color },
      areaStyle: { color, opacity: 0.08 },
      markPoint: { symbol: 'circle', symbolSize: 4, itemStyle: { color }, label: { show: false }, data: [{ name: 'último', coord: [values.length - 1, values[values.length - 1]] }] } }],
  }), [values, color])
  if (values.length < 2) return null
  return <EChart option={option} className="h-7 w-full" label={label} />
}
