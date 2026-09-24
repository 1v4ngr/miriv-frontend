import { useMemo, useState } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from '../../../../components/ui/echart'
import { formatLiters } from '../../../../lib/format'
import { wineColor } from '../../../cellar/components/deposit-badges'
import type { Deposit } from '../../../cellar/types'
import { activeOccupation } from '../../../cellar/utils'
import { HomeCard } from './home-card'

type Measure = 'deposits' | 'liters'
const EMPTY = '#d9ced4'

/**
 * How the cellar is split by content category, as deposits or as litres. Each bar wears the colour of its
 * wine (the same as the badges and the tank drawing); empty tanks, or the free capacity in litres, go last in grey.
 */
export function CategoryChart({ deposits }: { deposits: Deposit[] }) {
  const [measure, setMeasure] = useState<Measure>('deposits')
  const rows = useMemo(() => {
    const byCategory = new Map<string, { deposits: number; liters: number }>()
    let empty = 0
    let free = 0
    for (const deposit of deposits) {
      const occupation = activeOccupation(deposit)
      free += Math.max(0, deposit.capacityLiters - (occupation?.volumeLiters ?? 0))
      if (!occupation) { empty += 1; continue }
      const key = occupation.category || 'Sin categoría'
      const current = byCategory.get(key) ?? { deposits: 0, liters: 0 }
      byCategory.set(key, { deposits: current.deposits + 1, liters: current.liters + occupation.volumeLiters })
    }
    const occupied = [...byCategory.entries()].map(([name, value]) => ({ name, value: measure === 'deposits' ? value.deposits : value.liters, color: wineColor(name) })).sort((a, b) => b.value - a.value)
    const rest = measure === 'deposits' ? { name: 'Vacíos', value: empty, color: EMPTY } : { name: 'Capacidad libre', value: free, color: EMPTY }
    return rest.value > 0 ? [...occupied, rest] : occupied
  }, [deposits, measure])

  const format = (value: number) => (measure === 'deposits' ? String(value) : `${formatLiters(value)} L`)
  const option = useMemo<EChartsOption>(() => ({
    animationDuration: 500,
    grid: { left: 0, right: 72, top: 0, bottom: 0, containLabel: true },
    xAxis: { type: 'value', show: false },
    yAxis: { type: 'category', inverse: true, data: rows.map((row) => row.name), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#5b4f55', fontSize: 12 } },
    tooltip: { trigger: 'item', formatter: (params) => { const item = params as unknown as { name: string; value: number }; return `${item.name}<br/><b>${format(item.value)}</b>` } },
    series: [{
      type: 'bar', barWidth: 14,
      data: rows.map((row) => ({ value: row.value, itemStyle: { color: row.color, borderRadius: [0, 4, 4, 0] } })),
      label: { show: true, position: 'right', color: '#2e262a', fontSize: 12, formatter: (params) => format(Number((params as { value: number }).value)) },
    }],
  }), [rows]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (
    <div role="group" aria-label="Medida" className="flex rounded-lg bg-[#f7f1f4] p-0.5 text-[11px] font-semibold">
      {([['deposits', 'Depósitos'], ['liters', 'Litros']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={measure === value} onClick={() => setMeasure(value)} className={`h-7 rounded-md px-2.5 transition-colors ${measure === value ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`}>{label}</button>)}
    </div>
  )

  return (
    <HomeCard title="Por categoría" aside={toggle}>
      {rows.length === 0 ? <p className="py-6 text-center text-[12px] text-muted">No hay depósitos.</p>
        : <EChart option={option} label={`Depósitos por categoría: ${rows.map((row) => `${row.name} ${format(row.value)}`).join(', ')}`} className="w-full" style={{ height: rows.length * 30 }} />}
    </HomeCard>
  )
}
