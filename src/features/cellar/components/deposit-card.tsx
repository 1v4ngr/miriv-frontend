import { ArrowRight } from 'lucide-react'
import type { Deposit } from '../types'
import { activeOccupation, formatLiters, statusClass, statusLabel } from '../utils'
import { label as localize, fermentationLabels } from '../../../lib/labels'

interface DepositCardProps {
  deposit: Deposit
  onOpen: (code: string) => void
}

export function DepositCard({ deposit, onOpen }: DepositCardProps) {
  const occupation = activeOccupation(deposit)
  const volume = occupation?.volumeLiters ?? 0
  const fill = Math.min(100, Math.round(volume / deposit.capacityLiters * 100))

  return (
    <article className="rounded-2xl border border-border bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => onOpen(deposit.code)} className="font-mono text-[14px] font-medium text-plum hover:underline">{deposit.code}</button><span className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-tight tracking-wide ${statusClass(deposit)}`}>{statusLabel(deposit)}</span></div>
      <p className="mb-0 mt-2 text-[12px] text-muted">{deposit.zone ?? '—'} · {deposit.position}</p>
      <p className="my-2 text-[13px] font-semibold">{occupation ? `${occupation.category ?? '—'} · ${occupation.lotCode}` : 'Sin contenido actual'}</p>
      <div className="flex justify-between text-[11.5px] text-copy"><span>{formatLiters(volume)} / {formatLiters(deposit.capacityLiters)} L</span><span>{fill} % llenado</span></div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#efe6ea]"><div className="h-full rounded-full bg-plum" style={{ width: `${fill}%` }} /></div>
      {occupation ? <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]"><span className="rounded-lg bg-plum-soft px-2 py-1">FA {localize(fermentationLabels, occupation.alcoholicState)}</span><span className="rounded-lg bg-[#efeff5] px-2 py-1">FML {localize(fermentationLabels, occupation.malolacticState)}</span></div> : <p className="mt-3 text-[11px] leading-4 text-muted">{deposit.status === 'available' ? 'Disponible para entrada. No se muestran estados históricos como actuales.' : 'No admite entradas en su estado actual.'}</p>}
      <div className="mt-3 flex items-center justify-between gap-2"><span className="text-[11px] text-muted">{occupation ? `Control ${deposit.lastControlAge ?? 'pendiente'}` : deposit.nextTask ?? 'Sin controles'}</span><button type="button" onClick={() => onOpen(deposit.code)} className="flex min-h-8 items-center gap-1 rounded-lg bg-plum-soft px-2.5 text-[11.5px] font-semibold text-plum hover:bg-[#ead8e2]">Abrir <ArrowRight className="size-3" /></button></div>
    </article>
  )
}
