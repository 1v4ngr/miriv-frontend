import { Clock3 } from 'lucide-react'
import type { RecentActivity } from '../types'

interface RecentActivityProps {
  items: RecentActivity[]
}

export function RecentActivity({ items }: RecentActivityProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-[20px] border border-border bg-[#fdfbfc] p-5" aria-labelledby="recent-activity-title">
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="recent-activity-title" className="text-[17px] font-semibold">Movimientos recientes</h2>
        <Clock3 className="size-4 text-muted" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={`${item.time}-${item.content}`} className="flex items-start gap-2.5">
            <span className="shrink-0 pt-0.5 font-mono text-[12px] text-muted">{item.time}</span>
            <p className="m-0 text-[13.5px] leading-[1.5] text-ink">{item.content}</p>
          </div>
        ))}
      </div>
      {items.length === 0 && <p className="m-0 text-[12px] text-muted">No hay actividad que coincida con la búsqueda.</p>}
    </section>
  )
}