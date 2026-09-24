import { useState } from 'react'
import { AlertTriangle, ArrowLeftRight, Droplets, FlaskConical, LogIn, LogOut, Scale, Sparkles, type LucideIcon } from 'lucide-react'
import { formatDate } from '../../../../lib/format'
import type { TrackingAlert, TrackingEvent } from '../../../tracking/services/tracking-api'
import type { Sample } from '../../../laboratory/types'
import type { Deposit } from '../../types'

interface Item { at: string; icon: LucideIcon; tone: string; title: string; detail?: string; onClick?: () => void }

const EVENT_ICON: Record<TrackingEvent['type'], LucideIcon> = { TRANSFER: ArrowLeftRight, ENTRY: LogIn, MIX: ArrowLeftRight, SPLIT: ArrowLeftRight, EXIT: LogOut, LOSS: LogOut, ADJUSTMENT: Scale, STATE_REVIEW: Sparkles }
const SHOWN = 7
const time = (value: string) => { const parsed = new Date(value).getTime(); return Number.isNaN(parsed) ? 0 : parsed }

/** One timeline for everything that happened in the tank: alerts, samples, movements, state reviews and cleanings. */
export function ActivityFeed({ deposit, events, alerts, samples, onOpenSample }: { deposit: Deposit; events: TrackingEvent[]; alerts: TrackingAlert[]; samples: Sample[]; onOpenSample?: (code: string) => void }) {
  const [all, setAll] = useState(false)
  const items: Item[] = [
    ...alerts.map((alert) => ({ at: alert.since, icon: AlertTriangle, tone: alert.severity === 'CRIT' ? 'bg-[#f7dadf] text-[#8e1f33]' : 'bg-[#f8ecc9] text-[#6b5a10]', title: alert.rule, detail: alert.detail })),
    ...samples.map((sample) => ({ at: sample.takenAt, icon: FlaskConical, tone: sample.status === 'Validado' ? 'bg-[#e6f1e9] text-[#1f5c3a]' : 'bg-[#efeff5] text-[#43435c]', title: `Muestra ${sample.code}`, detail: `${sample.status} · ${sample.completed}/${sample.required} parámetros`, onClick: onOpenSample ? () => onOpenSample(sample.code) : undefined })),
    ...events.map((event) => ({ at: event.at, icon: EVENT_ICON[event.type] ?? Sparkles, tone: 'bg-plum-soft text-plum', title: event.label, detail: event.detail })),
    ...deposit.cleaningHistory.map((clean) => ({ at: clean.date, icon: Droplets, tone: 'bg-[#e3ebf4] text-[#2f4d6e]', title: clean.action, detail: `${clean.result} · ${clean.responsible}` })),
  ].sort((a, b) => time(b.at) - time(a.at))

  const shown = all ? items : items.slice(0, SHOWN)
  return (
    <section className="rounded-[18px] border border-border bg-white p-4 sm:p-5">
      <h2 className="text-[15px] font-semibold">Actividad</h2>
      {items.length === 0 ? <p className="mt-3 text-[12px] text-muted">Sin actividad registrada.</p> : (
        <ol className="relative mt-3 space-y-3 before:absolute before:bottom-2 before:left-[13px] before:top-2 before:w-px before:bg-border">
          {shown.map((item, index) => {
            const Icon = item.icon
            const body = <><span className={`relative z-[1] flex size-7 shrink-0 items-center justify-center rounded-full ring-4 ring-white ${item.tone}`}><Icon className="size-3.5" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block truncate text-[12px] font-medium text-ink">{item.title}</span><span className="block truncate text-[10.5px] text-muted">{formatDate(item.at)}{item.detail ? ` · ${item.detail}` : ''}</span></span></>
            return <li key={`${item.at}-${index}`}>{item.onClick ? <button type="button" onClick={item.onClick} className="-mx-1.5 flex w-[calc(100%+12px)] items-center gap-3 rounded-lg px-1.5 py-0.5 text-left hover:bg-[#fdfbfc]">{body}</button> : <div className="flex items-center gap-3">{body}</div>}</li>
          })}
        </ol>
      )}
      {items.length > SHOWN && <button type="button" onClick={() => setAll(!all)} className="mt-3 text-[11.5px] font-semibold text-plum hover:underline">{all ? 'Ver menos' : `Ver las ${items.length}`}</button>}
    </section>
  )
}
