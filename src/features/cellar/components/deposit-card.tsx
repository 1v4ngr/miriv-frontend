import { ArrowRight } from 'lucide-react'
import type { Deposit } from '../types'
import { activeOccupation, formatLiters, statusClass, statusLabel } from '../utils'
import { ContentBadge, LocationBadge, PhaseBadge } from './deposit-badges'
import { LastAnalysis } from '../last-analysis'
import type { ReportPhase } from '../../reports/services/reports-api'

interface DepositCardProps {
  deposit: Deposit
  onOpen: (code: string) => void
  /** Current elaboration phase of the content (undefined while loading). */
  phase?: ReportPhase | null
}

export function DepositCard({ deposit, onOpen, phase }: DepositCardProps) {
  const occupation = activeOccupation(deposit)
  const volume = occupation?.volumeLiters ?? 0
  const fill = Math.min(100, Math.round(volume / deposit.capacityLiters * 100))

  return (
    <article className="rounded-2xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => onOpen(deposit.code)} className="font-mono text-[14px] font-medium text-plum hover:underline">{deposit.code}</button><span className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-tight tracking-wide ${statusClass(deposit)}`}>{statusLabel(deposit)}</span></div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5"><LocationBadge zone={deposit.zone} /><ContentBadge category={occupation ? occupation.category : undefined} />{deposit.position && <span className="text-[11px] text-muted">{deposit.position}</span>}</div>
      <p className="my-2 text-[13px] font-semibold">{occupation ? <span className="font-mono">{occupation.lotCode}</span> : 'Sin contenido actual'}</p>
      <div className="flex justify-between text-[11.5px] text-copy"><span>{formatLiters(volume)} / {formatLiters(deposit.capacityLiters)} L</span><span>{fill} % llenado</span></div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#efe6ea]"><div className="h-full rounded-full bg-plum" style={{ width: `${fill}%` }} /></div>
      {occupation ? <div className="mt-3"><PhaseBadge phase={phase} /></div> : <p className="mt-3 text-[11px] leading-4 text-muted">{deposit.status === 'available' ? 'Disponible para entrada. No se muestran estados históricos como actuales.' : 'No admite entradas en su estado actual.'}</p>}
      <div className="mt-3 flex items-center justify-between gap-2"><LastAnalysis deposit={deposit} compact /><button type="button" onClick={() => onOpen(deposit.code)} className="flex min-h-8 items-center gap-1 rounded-lg bg-plum-soft px-2.5 text-[11.5px] font-semibold text-plum hover:bg-[#ead8e2]">Abrir <ArrowRight className="size-3" /></button></div>
    </article>
  )
}
