import { Trash2 } from 'lucide-react'
import { formatLiters } from '../../../lib/format'
import { contentColors } from '../../tracking/utils'
import type { WineComponent } from '../types'

interface Props {
  components: WineComponent[]
  total: number
  /** Deposit where the blend is made: its component is used whole. */
  destinationCode: string | null
  locked: boolean
  onVolume: (id: string, liters: number) => void
  onRemove: (id: string) => void
}

/** One card per tank: litres by slider or number, percentage of the blend and how old its analysis is. */
export function ComponentList({ components, total, destinationCode, locked, onVolume, onRemove }: Props) {
  if (components.length === 0) return <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">Elige depósitos arriba para empezar a mezclar.</p>
  return (
    <ul className="space-y-2">
      {components.map((component, index) => {
        const max = component.availableLiters ?? Math.max(component.volumeLiters, 10000)
        const isDestination = destinationCode !== null && component.depositCode === destinationCode
        const oldest = Math.max(0, ...Object.values(component.readings).map((reading) => reading.daysAgo))
        const percent = total > 0 ? (component.volumeLiters / total) * 100 : 0
        return (
          <li key={component.id} className="rounded-xl border border-border bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-xs font-semibold"><span className="size-2.5 shrink-0 rounded-full" style={{ background: contentColors[index % contentColors.length] }} aria-hidden="true" />{component.label}</p>
                <p className="mt-0.5 text-[11px] text-muted">Disponible {component.availableLiters === null ? '—' : `${formatLiters(component.availableLiters)} L`} · analítica más antigua {oldest <= 0 ? 'de hoy' : `de hace ${oldest} d`}</p>
              </div>
              <button type="button" disabled={locked} aria-label={`Quitar ${component.label}`} onClick={() => onRemove(component.id)} className="text-muted hover:text-[#8e1f33] disabled:opacity-40"><Trash2 className="size-4" /></button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <input type="range" min={0} max={max} step={10} value={Math.min(component.volumeLiters, max)} disabled={locked || isDestination}
                aria-label={`Litros de ${component.label}`} onChange={(event) => onVolume(component.id, Number(event.target.value))} className="min-w-0 flex-1 accent-plum" />
              <input type="number" min={0} max={max} step={10} value={Math.round(component.volumeLiters)} disabled={locked || isDestination}
                aria-label={`Litros de ${component.label} (número)`} onChange={(event) => onVolume(component.id, Math.max(0, Number(event.target.value) || 0))} className="w-24 rounded-lg border border-border px-2 py-1 text-right text-xs" />
              <span className="text-[11px] text-muted">L</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-muted">
              <span>{percent.toFixed(1).replace('.', ',')} % de la mezcla</span>
              {isDestination
                ? <span className="font-semibold text-plum">Es el destino: se usa entero</span>
                : <button type="button" disabled={locked || component.availableLiters === null} onClick={() => onVolume(component.id, component.availableLiters ?? 0)} className="font-semibold text-plum disabled:opacity-40">Todo</button>}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
