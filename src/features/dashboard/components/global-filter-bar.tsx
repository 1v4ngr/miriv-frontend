import { X } from 'lucide-react'
import { MultiSelect } from '../../tracking/components/multi-select'
import type { Period } from '../../tracking/favorites'
import { PERIODS } from '../../tracking/period'
import { useDashboardContext } from '../dashboard-context'

const select = 'rounded-xl border border-border bg-white px-2 py-1.5 text-xs'

/** Period, tanks and category shared by every panel that has "Seguir filtros globales" on. */
export function GlobalFilterBar() {
  const { globals, setGlobals, overview } = useDashboardContext()
  const rows = overview?.rows ?? []
  const categories = [...new Set(rows.map((row) => row.category).filter((value): value is string => !!value))].sort()
  const options = rows.map((row) => ({ value: row.content, label: `${row.deposit} · ${row.content}`, hint: row.category ?? undefined }))
  for (const code of globals.contents) if (!options.some((option) => option.value === code)) options.push({ value: code, label: code, hint: undefined })
  const active = globals.contents.length > 0 || globals.category !== '' || globals.period !== '30'

  return (
    <section aria-label="Filtros globales" className="grid gap-3 rounded-2xl border border-border bg-white p-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
      <MultiSelect label="Depósitos (globales)" options={options} selected={globals.contents} onChange={(contents) => setGlobals({ ...globals, contents })} placeholder="Todos los de cada panel" max={40} />
      <label className="grid gap-1 text-[11px] font-semibold text-muted">Periodo
        <select value={globals.period} onChange={(event) => setGlobals({ ...globals, period: event.target.value as Period })} className={`${select} font-normal text-copy`}>
          {PERIODS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-[11px] font-semibold text-muted">Categoría
        <select value={globals.category} onChange={(event) => setGlobals({ ...globals, category: event.target.value })} className={`${select} font-normal text-copy`}>
          <option value="">Todas</option>{categories.map((category) => <option key={category}>{category}</option>)}
        </select>
      </label>
      <button type="button" disabled={!active} onClick={() => setGlobals({ period: '30', contents: [], category: '' })} className="flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-50"><X className="size-3.5" />Limpiar</button>
    </section>
  )
}
