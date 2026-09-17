import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { cellarApi } from '../../cellar/services/cellar-api'
import { activeOccupation, formatLiters, statusClass, statusLabel } from '../../cellar/utils'
import type { Deposit } from '../../cellar/types'

interface Props { onOpenCurves: (contentCode: string) => void }

export function TrackingListPage({ onOpenCurves }: Props) {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cellarApi.getDeposits().then(setDeposits).finally(() => setLoading(false)) }, [])

  const active = deposits.filter((deposit) => activeOccupation(deposit))

  if (loading) return <p className="p-6 text-center text-xs text-muted">Cargando seguimiento…</p>

  return <div className="space-y-4">
    <header><p className="text-[11px] text-muted">Seguimiento</p><h1 className="mt-1 text-[23px] font-semibold">Seguimiento enológico</h1><p className="mt-1 text-xs text-muted">Unidades activas con datos analíticos disponibles. Selecciona una para ver su evolución.</p></header>
    {active.length === 0 && <p className="rounded-2xl border border-border bg-white p-6 text-center text-xs text-muted">No hay unidades activas en seguimiento.</p>}
    <div className="space-y-2">{active.map((deposit) => {
      const occupation = activeOccupation(deposit)!
      return <button key={occupation.contentCode} type="button" onClick={() => onOpenCurves(occupation.contentCode)} className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4 text-left hover:bg-plum-soft">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[14px] font-semibold">{occupation.contentCode}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(deposit)}`}>{statusLabel(deposit)}</span></div>
          <p className="mt-1 text-[11.5px] text-muted">{deposit.code} · {occupation.lotCode} · {occupation.category} · {formatLiters(occupation.volumeLiters)} L</p>
        </div>
        <div className="flex items-center gap-4 text-[11.5px] text-muted">
          <span>{occupation.alcoholicState}</span>
          <span className="flex items-center gap-1 font-semibold text-plum">Ver curvas <ArrowRight className="size-3.5" /></span>
        </div>
      </button>
    })}</div>
  </div>
}
