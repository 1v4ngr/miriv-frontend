import { ArrowLeftRight, LogIn, LogOut, Scale, type LucideIcon } from 'lucide-react'
import { formatLiters } from '../../../../lib/format'
import type { RecentActivity } from '../../types'
import { HomeCard } from './home-card'

const TYPE: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  ENTRY: { label: 'Entrada', icon: LogIn, tone: 'bg-[#e6f1e9] text-[#1f5c3a]' },
  TRANSFER: { label: 'Trasiego', icon: ArrowLeftRight, tone: 'bg-plum-soft text-plum' },
  MIX: { label: 'Mezcla', icon: ArrowLeftRight, tone: 'bg-plum-soft text-plum' },
  SPLIT: { label: 'Reparto', icon: ArrowLeftRight, tone: 'bg-plum-soft text-plum' },
  EXIT: { label: 'Salida', icon: LogOut, tone: 'bg-[#efeff5] text-[#43435c]' },
  LOSS: { label: 'Baja', icon: LogOut, tone: 'bg-[#f7dadf] text-[#8e1f33]' },
  ADJUSTMENT: { label: 'Ajuste', icon: Scale, tone: 'bg-[#efeff5] text-[#43435c]' },
}

const relative = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
function ago(iso: string) {
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60_000)
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute')
  if (Math.abs(minutes) < 60 * 24) return relative.format(Math.round(minutes / 60), 'hour')
  return relative.format(Math.round(minutes / 1440), 'day')
}

/** Last movements in words: "Entrada en 242 · 26.000 L · TIN-2026-018 · ayer". */
export function RecentMovements({ items, onOpenMovement, onOpenAll }: { items: RecentActivity[]; onOpenMovement: (code: string) => void; onOpenAll: () => void }) {
  return (
    <HomeCard title="Movimientos recientes" aside={<button type="button" onClick={onOpenAll} className="text-[11.5px] font-semibold text-plum hover:underline">Ver todos</button>}>
      {items.length === 0 ? <p className="py-4 text-center text-[12px] text-muted">Sin movimientos todavía.</p> : (
        <ul className="-mx-1.5">
          {items.map((item) => {
            const type = TYPE[item.type] ?? { label: item.type, icon: ArrowLeftRight, tone: 'bg-[#efeff5] text-[#43435c]' }
            const Icon = type.icon
            const where = item.source && item.destination ? `${item.source} → ${item.destination}` : item.destination ? `en ${item.destination}` : item.source ? `de ${item.source}` : ''
            return (
              <li key={item.code}>
                <button type="button" onClick={() => onOpenMovement(item.code)} className="flex w-full items-center gap-3 rounded-lg px-1.5 py-2 text-left transition-colors hover:bg-[#fdfbfc]">
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-full ${type.tone}`}><Icon className="size-4" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-ink"><span className="font-semibold">{type.label}</span> {where && <span className="font-mono">{where}</span>}</span>
                    <span className="block truncate text-[11px] text-muted">{[item.liters !== null ? `${formatLiters(item.liters)} L` : null, item.lot].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="shrink-0 text-[11px] text-muted">{item.at ? ago(item.at) : item.time}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </HomeCard>
  )
}
