import { ArrowUpRight, Beaker, Droplets, FlaskConical } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/status-badge'
import type { AttentionItem } from '../types'

interface AttentionCardProps {
  item: AttentionItem
  onAction: (item: AttentionItem) => void
}

const priorityTone = {
  critical: 'critical',
  overdue: 'overdue',
  high: 'high',
} as const

function AttentionIcon({ priority }: { priority: AttentionItem['priority'] }) {
  if (priority === 'critical') return <Droplets className="size-5 text-plum" aria-hidden="true" />
  if (priority === 'overdue') return <FlaskConical className="size-5 text-[#a66e40]" aria-hidden="true" />
  return <Beaker className="size-5 text-plum" aria-hidden="true" />
}

export function AttentionCard({ item, onAction }: AttentionCardProps) {
  return (
    <article className={`rounded-2xl border bg-white p-3.5 transition-shadow hover:shadow-[0_12px_24px_-22px_rgba(70,40,55,0.7)] ${item.priority === 'critical' ? 'border-[#f0d9de]' : 'border-[#efe6ea]'}`}>
      <div className="flex items-start gap-3">
        <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${item.priority === 'overdue' ? 'bg-[#f5eed0]' : 'bg-[#e8dcea]'}`}><AttentionIcon priority={item.priority} /></div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[12.5px]">{item.containerCode}</span>
          <StatusBadge tone={priorityTone[item.priority]}>{item.priorityLabel}</StatusBadge>
          <span className="text-[11px] text-muted">{item.category} · {item.lotCode}</span>
          </div>
          <div className="text-[12.5px] leading-[1.45] text-ink">{item.title}</div>
          <div className="text-[11px] leading-4 text-muted">{item.value ? `${item.value} ${item.valueUnit} · ` : ''}{item.detail}</div>
        </div>
      </div>
      <button type="button" onClick={() => onAction(item)} className={`ml-12 mt-2 flex min-h-8 items-center justify-center gap-1.5 rounded-lg px-3 text-[11.5px] font-semibold transition-colors ${item.priority === 'overdue' ? 'border border-[#e0d2d9] hover:bg-[#faf4f7]' : 'bg-[#f3e7ee] text-plum hover:bg-[#ead8e2]'}`}>
        <span>{item.actionLabel}</span><ArrowUpRight className="size-3" aria-hidden="true" />
      </button>
    </article>
  )
}
