import { AlertTriangle, CheckCircle2, ChevronRight, Clock } from 'lucide-react'
import type { OverviewResponse, OverviewRow } from '../../../tracking/services/tracking-api'
import { formatReading, STALE_DAYS } from '../../../tracking/utils'
import { HomeCard } from './home-card'

interface Item { deposit: string; severity: 0 | 1 | 2; title: string; detail: string; days: number | null }

const TONE = ['bg-[#f7dadf] text-[#8e1f33]', 'bg-[#f8ecc9] text-[#6b5a10]', 'bg-[#efeff5] text-[#43435c]'] as const

/** What needs a look now: readings out of range (critical first) and tanks without a recent analysis. */
export function attentionItems(tracking: OverviewResponse | undefined): Item[] {
  if (!tracking) return []
  const name = (code: string) => tracking.parameters.find((parameter) => parameter.code === code)
  const out: Item[] = []
  for (const row of tracking.rows) {
    const flagged = flaggedCell(row)
    if (flagged) {
      const parameter = name(flagged.parameter)
      const latest = flagged.latest!
      out.push({ deposit: row.deposit, severity: latest.status === 'CRIT' ? 0 : 1, title: parameter?.name ?? flagged.parameter,
        detail: `${formatReading(latest.value, latest.qualifier, latest.limit, parameter?.decimals ?? 2)} ${parameter?.unit ?? ''}`.trim(), days: latest.daysAgo })
    } else if (row.daysSinceLastSample === null || row.daysSinceLastSample > STALE_DAYS) {
      out.push({ deposit: row.deposit, severity: 2, title: 'Sin análisis reciente', detail: row.daysSinceLastSample === null ? 'Nunca analizado' : `Último hace ${row.daysSinceLastSample} d`, days: row.daysSinceLastSample })
    }
  }
  return out.sort((a, b) => a.severity - b.severity || (b.days ?? 999) - (a.days ?? 999))
}

function flaggedCell(row: OverviewRow) {
  return row.cells.find((cell) => cell.latest?.status === 'CRIT') ?? row.cells.find((cell) => cell.latest?.status === 'WARN')
}

export function AttentionList({ tracking, onOpenDeposit, onOpenTracking, limit = 6 }: { tracking?: OverviewResponse; onOpenDeposit: (code: string) => void; onOpenTracking: () => void; limit?: number }) {
  const items = attentionItems(tracking)
  const aside = items.length > 0 && <span className="text-[11.5px] text-muted">{items.length} depósito{items.length === 1 ? '' : 's'}</span>
  return (
    <HomeCard id="necesitan-atencion" title="Necesitan atención" aside={aside}>
      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-xl bg-[#f3f8f4] px-4 py-5 text-[12.5px] text-[#1f5c3a]"><CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />Todo en rango y con análisis al día.</div>
      ) : (
        <>
          <ul className="-mx-1.5 divide-y divide-border">
            {items.slice(0, limit).map((item) => {
              const Icon = item.severity === 2 ? Clock : AlertTriangle
              return (
                <li key={`${item.deposit}-${item.title}`}>
                  <button type="button" onClick={() => onOpenDeposit(item.deposit)} className="flex w-full items-center gap-3 rounded-lg px-1.5 py-2.5 text-left transition-colors hover:bg-[#fdfbfc]">
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${TONE[item.severity]}`}><Icon className="size-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] text-ink"><span className="font-mono font-semibold">{item.deposit}</span> · {item.title}</span>
                      <span className="block truncate text-[11px] text-muted">{item.detail}{item.severity < 2 && item.days !== null ? ` · ${item.days <= 0 ? 'hoy' : `hace ${item.days} d`}` : ''}</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
                  </button>
                </li>
              )
            })}
          </ul>
          <button type="button" onClick={onOpenTracking} className="mt-auto self-start pt-2 text-[11.5px] font-semibold text-plum hover:underline">{items.length > limit ? `Ver los ${items.length} en Seguimiento` : 'Ver en Seguimiento'}</button>
        </>
      )}
    </HomeCard>
  )
}
