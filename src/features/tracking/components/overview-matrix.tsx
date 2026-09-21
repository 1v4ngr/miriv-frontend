import { AlertTriangle, ArrowDown, ArrowUp, Minus } from 'lucide-react'
import { formatLiters, formatRelative } from '../../../lib/format'
import { fermentationLabels } from '../../../lib/labels'
import type { OverviewRow, ParameterInfo } from '../services/tracking-api'
import { STALE_DAYS, formatAge, formatReading, statusClass, statusLabel } from '../utils'

const th = 'whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold text-muted'

interface Props {
  rows: OverviewRow[]
  parameters: ParameterInfo[]
  onOpenRow: (contentCode: string) => void
  /** Optional selection column (used to pick tanks to compare). */
  selected?: string[]
  onToggle?: (contentCode: string) => void
  onToggleAll?: (allSelected: boolean) => void
}

/** Cellar-wide status matrix: one row per occupied tank, latest key parameters coloured against their targets. */
export function OverviewMatrix({ rows, parameters, onOpenRow, selected, onToggle, onToggleAll }: Props) {
  const selectable = selected !== undefined && onToggle !== undefined
  const allSelected = selectable && rows.length > 0 && rows.every((row) => selected.includes(row.content))
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-white">
    <table className="w-full min-w-[860px] border-collapse">
      <thead>
        <tr className="border-b border-border bg-[#fbf7f9]">
          {selectable && <th className={th}><input type="checkbox" aria-label="Seleccionar todos los visibles" checked={allSelected} onChange={() => onToggleAll?.(allSelected)} className="size-3.5 accent-plum" /></th>}
          <th className={`${th} sticky left-0 bg-[#fbf7f9]`}>Depósito</th>
          <th className={th}>Fermentación</th>
          {parameters.map((parameter) => <th key={parameter.code} className={th}>{parameter.name}<div className="font-normal">{parameter.unit}</div></th>)}
          <th className={th}>Pendiente</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.content} className="border-b border-border last:border-0 hover:bg-[#fdfafb]">
            {selectable && <td className="px-3 py-2"><input type="checkbox" aria-label={`Seleccionar ${row.deposit}`} checked={selected.includes(row.content)} onChange={() => onToggle(row.content)} className="size-3.5 accent-plum" /></td>}
            <td className="sticky left-0 bg-white px-3 py-2">
              <button type="button" onClick={() => onOpenRow(row.content)} className="text-left">
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-plum hover:underline">{row.deposit}{row.worstStatus === 'CRIT' && <AlertTriangle className="size-3.5 text-[#b3263f]" aria-label="Crítico" />}</span>
                <span className="block font-mono text-[11px] text-copy">{row.content}</span>
                <span className="block text-[10.5px] text-muted">{[row.category, `${formatLiters(row.volumeLiters ?? 0)} L`, row.zone].filter(Boolean).join(' · ')}</span>
              </button>
            </td>
            <td className="px-3 py-2 text-xs">{row.alcoholicState ? fermentationLabels[row.alcoholicState] ?? row.alcoholicState : '—'}</td>
            {row.cells.map((cell, index) => {
              const parameter = parameters[index]
              const latest = cell.latest
              if (!latest) return <td key={cell.parameter} className="px-3 py-2 text-xs text-muted">—</td>
              const old = latest.daysAgo > STALE_DAYS
              return (
                <td key={cell.parameter} className={`px-3 py-2 ${old ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-1" title={`${statusLabel[latest.status]} · ${formatAge(latest.daysAgo)}${old ? ' (desfasado)' : ''}`}>
                    <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${statusClass[latest.status]}`}>{formatReading(latest.value, latest.qualifier, latest.limit, parameter?.decimals ?? 2)}</span>
                    <Trend trend={cell.trend} previous={cell.previous ? formatReading(cell.previous.value, cell.previous.qualifier, cell.previous.limit, parameter?.decimals ?? 2) : undefined} />
                  </div>
                  <div className={`mt-0.5 text-[10.5px] ${old ? 'font-semibold text-[#8e6a10]' : 'text-muted'}`}>{formatAge(latest.daysAgo)}</div>
                </td>
              )
            })}
            <td className="px-3 py-2 text-[11px] text-muted">
              {row.daysSinceLastSample === null || row.daysSinceLastSample > STALE_DAYS
                ? <div className="font-semibold text-[#8e6a10]">{row.daysSinceLastSample === null ? 'Nunca muestreado' : `Sin muestra ${formatAge(row.daysSinceLastSample)}`}</div>
                : null}
              {row.openSamples > 0 && <div>{row.openSamples} muestra(s) abierta(s)</div>}
              {row.openSamples === 0 && row.daysSinceLastSample !== null && row.daysSinceLastSample <= STALE_DAYS && '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  )
}

function Trend({ trend, previous }: { trend: 'UP' | 'DOWN' | 'FLAT' | null; previous?: string }) {
  if (!trend) return null
  const title = previous ? `Antes: ${previous}` : undefined
  if (trend === 'UP') return <ArrowUp className="size-3.5 text-muted" aria-label="Sube" >{title && <title>{title}</title>}</ArrowUp>
  if (trend === 'DOWN') return <ArrowDown className="size-3.5 text-muted" aria-label="Baja">{title && <title>{title}</title>}</ArrowDown>
  return <Minus className="size-3.5 text-muted" aria-label="Estable">{title && <title>{title}</title>}</Minus>
}

export function MatrixLegend() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
      {(['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const).map((status) => <span key={status} className="flex items-center gap-1.5"><span className={`inline-block h-3 w-5 rounded ${statusClass[status]}`} />{statusLabel[status]}</span>)}
      <span>Sin color: parámetro sin objetivo. Valores atenuados: muestra de hace más de {STALE_DAYS} días. Las flechas comparan con el análisis anterior.</span>
    </p>
  )
}
