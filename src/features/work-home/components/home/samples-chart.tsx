import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from '../../../../components/ui/echart'
import type { DayCount } from '../../types'
import { HomeCard } from './home-card'

const DAY = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
const label = (iso: string) => DAY.format(new Date(`${iso}T12:00:00`))

/** Samples registered each day over the last 30 days: one plum column per day, weekly axis labels. */
export function SamplesChart({ days, onOpen }: { days: DayCount[]; onOpen?: () => void }) {
  const total = days.reduce((sum, day) => sum + day.count, 0)
  const option = useMemo<EChartsOption>(() => ({
    animationDuration: 500,
    grid: { left: 4, right: 4, top: 12, bottom: 4, containLabel: true },
    xAxis: { type: 'category', data: days.map((day) => label(day.date)), axisTick: { show: false }, axisLine: { lineStyle: { color: '#e5d9df' } }, axisLabel: { color: '#8a7d84', fontSize: 11, interval: 6, hideOverlap: true } },
    yAxis: { type: 'value', minInterval: 1, splitNumber: 3, axisLabel: { color: '#8a7d84', fontSize: 11 }, splitLine: { lineStyle: { color: '#f1eaee' } } },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: 'rgba(109,70,86,0.06)' } }, formatter: (params) => { const [item] = params as unknown as { name: string; value: number }[]; return `${item.name}<br/><b>${item.value} muestra${item.value === 1 ? '' : 's'}</b>` } },
    series: [{ type: 'bar', data: days.map((day) => day.count), barMaxWidth: 14, itemStyle: { color: '#6d4656', borderRadius: [4, 4, 0, 0] }, emphasis: { itemStyle: { color: '#4f2f3d' } } }],
  }), [days])

  return (
    <HomeCard title="Análisis por día" aside={<span className="text-[11.5px] text-muted"><span className="font-semibold text-ink">{total}</span> en 30 días · {(total / Math.max(1, days.length)).toLocaleString('es-ES', { maximumFractionDigits: 1 })}/día</span>}>
      <EChart option={option} label={`Muestras por día en los últimos 30 días: ${total} en total`} className="h-44 w-full sm:h-52 xl:h-auto xl:min-h-52 xl:flex-1" />
      {onOpen && <button type="button" onClick={onOpen} className="mt-2 text-[11.5px] font-semibold text-plum hover:underline">Ir a laboratorio</button>}
    </HomeCard>
  )
}
