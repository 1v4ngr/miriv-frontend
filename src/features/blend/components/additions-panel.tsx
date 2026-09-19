import { AlertTriangle, Trash2 } from 'lucide-react'
import { newId } from '../../dashboard/defaults'
import type { Addition, AdditionType } from '../types'

const LABELS: Record<AdditionType, { name: string; unit: string; step: number }> = {
  WATER: { name: 'Agua', unit: 'L', step: 10 },
  TARTARIC_ACID: { name: 'Ácido tartárico', unit: 'g/hL', step: 5 },
  POTASSIUM_METABISULFITE: { name: 'Metabisulfito potásico', unit: 'g/hL', step: 1 },
  SO2_SOLUTION: { name: 'SO₂ en solución', unit: 'mg/L', step: 5 },
}
const DEFAULT_AMOUNT: Record<AdditionType, number> = { WATER: 100, TARTARIC_ACID: 100, POTASSIUM_METABISULFITE: 5, SO2_SOLUTION: 20 }

interface Props { additions: Addition[]; locked: boolean; onChange: (additions: Addition[]) => void }

export function AdditionsPanel({ additions, locked, onChange }: Props) {
  const add = (type: AdditionType) => onChange([...additions, { id: newId(), type, amount: DEFAULT_AMOUNT[type], ...(type === 'WATER' ? { waterTemperature: 15 } : {}) }])
  const patch = (id: string, change: Partial<Addition>) => onChange(additions.map((item) => (item.id === id ? { ...item, ...change } : item)))
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(LABELS) as AdditionType[]).map((type) => (
          <button key={type} type="button" disabled={locked} onClick={() => add(type)} className="rounded-full border border-border px-2.5 py-1 text-[11.5px] font-semibold text-plum hover:bg-plum-soft disabled:opacity-40">+ {LABELS[type].name}</button>
        ))}
      </div>
      {additions.map((addition) => (
        <div key={addition.id} className={`rounded-xl border p-2 text-xs ${addition.type === 'WATER' ? 'border-[#e3d08a] bg-[#fbf6df]' : 'border-border bg-white'}`}>
          <div className="flex items-center gap-2">
            <span className="flex-1 font-semibold">{LABELS[addition.type].name}</span>
            <input type="number" min={0} step={LABELS[addition.type].step} value={addition.amount} disabled={locked} aria-label={`Cantidad de ${LABELS[addition.type].name}`}
              onChange={(event) => patch(addition.id, { amount: Math.max(0, Number(event.target.value) || 0) })} className="w-24 rounded-lg border border-border bg-white px-2 py-1 text-right" />
            <span className="w-10 text-muted">{LABELS[addition.type].unit}</span>
            <button type="button" disabled={locked} aria-label={`Quitar ${LABELS[addition.type].name}`} onClick={() => onChange(additions.filter((item) => item.id !== addition.id))} className="text-muted hover:text-[#8e1f33]"><Trash2 className="size-4" /></button>
          </div>
          {addition.type === 'WATER' && (
            <>
              <label className="mt-2 flex items-center gap-2 text-[11px] text-muted">Temperatura del agua
                <input type="number" step={1} value={addition.waterTemperature ?? 15} disabled={locked} onChange={(event) => patch(addition.id, { waterTemperature: Number(event.target.value) })} className="w-16 rounded-lg border border-border bg-white px-2 py-0.5 text-right" />°C
              </label>
              <p className="mt-2 flex gap-1.5 text-[11px] text-[#6b5a10]"><AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />Añadir agua al vino solo está permitido por necesidad técnica específica (Reg. UE 1308/2013, anexo VIII, parte II). Se puede simular, pero no convertir en tarea.</p>
            </>
          )}
        </div>
      ))}
    </div>
  )
}
