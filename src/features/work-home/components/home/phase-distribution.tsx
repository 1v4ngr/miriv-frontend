import { useMemo } from 'react'
import type { EChartsOption } from 'echarts'
import { EChart } from '../../../../components/ui/echart'
import type { ReportPhase } from '../../../reports/services/reports-api'
import { HomeCard } from './home-card'

const NONE_COLOR = '#d9ced4'

/** Occupied deposits per elaboration phase: one stacked bar in the phases' order and colours, and its legend. */
export function PhaseDistribution({ phases, phaseByDeposit, onOpen }: { phases: ReportPhase[]; phaseByDeposit: Map<string, ReportPhase | null>; onOpen?: () => void }) {
  const rows = useMemo(() => {
    const counts = new Map<string, number>()
    let none = 0
    for (const phase of phaseByDeposit.values()) { if (phase) counts.set(phase.code, (counts.get(phase.code) ?? 0) + 1); else none += 1 }
    const list = phases.map((phase) => ({ name: phase.name, color: phase.color, value: counts.get(phase.code) ?? 0 })).filter((row) => row.value > 0)
    return none > 0 ? [...list, { name: 'Sin fase', color: NONE_COLOR, value: none }] : list
  }, [phases, phaseByDeposit])
  const total = rows.reduce((sum, row) => sum + row.value, 0)

  const option = useMemo<EChartsOption>(() => ({
    animationDuration: 500,
    grid: { left: 0, right: 0, top: 0, bottom: 0 },
    xAxis: { type: 'value', show: false, max: total || 1 },
    yAxis: { type: 'category', show: false, data: [''] },
    tooltip: { trigger: 'item', formatter: (params) => { const item = params as unknown as { seriesName: string; value: number }; return `${item.seriesName}<br/><b>${item.value} depósito${item.value === 1 ? '' : 's'}</b>` } },
    // A 2px white border is the gap between segments; only the ends are rounded.
    series: rows.map((row, index) => ({ type: 'bar', name: row.name, stack: 'phases', barWidth: 14, data: [row.value],
      itemStyle: { color: row.color, borderColor: '#ffffff', borderWidth: 2, borderRadius: [index === 0 ? 7 : 0, index === rows.length - 1 ? 7 : 0, index === rows.length - 1 ? 7 : 0, index === 0 ? 7 : 0] } })),
  }), [rows, total])

  return (
    <HomeCard title="Por fase" aside={<span className="text-[11.5px] text-muted">{total} con contenido</span>}>
      {total === 0 ? <p className="py-4 text-center text-[12px] text-muted">Sin contenidos en bodega.</p> : <>
        <EChart option={option} label={`Depósitos por fase: ${rows.map((row) => `${row.name} ${row.value}`).join(', ')}`} className="h-4 w-full" />
        <ul className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {rows.map((row) => (
            <li key={row.name} className="flex min-w-0 items-center gap-2 text-[12px]">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: row.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-copy">{row.name}</span>
              <span className="font-mono font-semibold text-ink">{row.value}</span>
            </li>
          ))}
        </ul>
        {onOpen && <button type="button" onClick={onOpen} className="mt-3 text-[11.5px] font-semibold text-plum hover:underline">Ver depósitos</button>}
      </>}
    </HomeCard>
  )
}
