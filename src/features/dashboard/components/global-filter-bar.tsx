import { X } from 'lucide-react'
import type { Period } from '../../tracking/favorites'
import { PERIODS } from '../../tracking/period'
import { useDashboardContext } from '../dashboard-context'
import { DepositPicker } from './deposit-picker'

const select = 'rounded-xl border border-border bg-white px-2 py-1.5 text-xs'

/** One compact strip: tank pills, period and category, shared by every panel that follows the global filters. */
export function GlobalFilterBar() {
  const { globals, setGlobals, overview } = useDashboardContext()
  const rows = overview?.rows ?? []
  const categories = [...new Set(rows.map((row) => row.category).filter((value): value is string => !!value))].sort()
  const active = globals.contents.length > 0 || globals.category !== '' || globals.period !== '30'

  return (
    <section aria-label="Filtros globales" className="flex flex-wrap items-end gap-x-4 gap-y-2 rounded-2xl border border-border bg-white px-3 py-2">
      <div className="min-w-[220px] flex-1"><DepositPicker rows={rows} selected={globals.contents} onChange={(contents) => setGlobals({ ...globals, contents })} label="Depósitos (globales)" /></div>
      <label className="grid gap-0.5 text-[11px] font-semibold text-muted">Periodo
        <select value={globals.period} onChange={(event) => setGlobals({ ...globals, period: event.target.value as Period })} className={`${select} font-normal text-copy`}>
          {PERIODS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {categories.length > 1 && (
        <label className="grid gap-0.5 text-[11px] font-semibold text-muted">Categoría
          <select value={globals.category} onChange={(event) => setGlobals({ ...globals, category: event.target.value })} className={`${select} font-normal text-copy`}>
            <option value="">Todas</option>{categories.map((category) => <option key={category}>{category}</option>)}
          </select>
        </label>
      )}
      <button type="button" disabled={!active} onClick={() => setGlobals({ period: '30', contents: [], category: '' })} className="flex items-center gap-1 rounded-xl px-2 py-1.5 text-xs font-semibold text-muted hover:text-plum disabled:opacity-40"><X className="size-3.5" />Limpiar</button>
    </section>
  )
}
