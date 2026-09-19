import { ArrowRight } from 'lucide-react'
import { useResource } from '../../../hooks/use-resource'
import { trackingApi } from '../services/tracking-api'
import { formatAge, formatReading, statusClass, statusLabel } from '../utils'

/** Real warnings / critical readings of one content against the configured targets (nothing when all is in range). */
export function ContentAnalyticStatus({ code, onOpenTracking }: { code: string; onOpenTracking: (code: string) => void }) {
  const overview = useResource(() => trackingApi.overview(), [code])
  const row = overview.data?.rows.find((item) => item.content === code)
  const parameters = overview.data?.parameters ?? []
  const flagged = (row?.cells ?? []).flatMap((cell) => {
    const parameter = parameters.find((item) => item.code === cell.parameter)
    return cell.latest && (cell.latest.status === 'WARN' || cell.latest.status === 'CRIT') && parameter ? [{ cell, parameter }] : []
  })
  if (flagged.length === 0) return null
  const critical = flagged.some(({ cell }) => cell.latest?.status === 'CRIT')
  return (
    <section className={`rounded-2xl border bg-white p-4 ${critical ? 'border-[#efc9d1]' : 'border-[#e3d08a]'}`} aria-label="Parámetros fuera de objetivo">
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${critical ? statusClass.CRIT : statusClass.WARN}`}>{critical ? 'Crítico' : 'Aviso'}</span>
        <h2 className="text-sm font-semibold">Parámetros fuera de objetivo</h2>
      </div>
      <ul className="mt-2 space-y-1 text-xs text-copy">
        {flagged.map(({ cell, parameter }) => (
          <li key={parameter.code}>
            <strong>{parameter.name}</strong>: {formatReading(cell.latest!.value, cell.latest!.qualifier, cell.latest!.limit, parameter.decimals)} {parameter.unit} · {statusLabel[cell.latest!.status].toLowerCase()} · {formatAge(cell.latest!.daysAgo)}
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => onOpenTracking(code)} className="mt-3 text-xs font-semibold text-plum">Ver evolución <ArrowRight className="inline size-3" /></button>
    </section>
  )
}
