import { useState } from 'react'
import { Search } from 'lucide-react'
import type { OverviewRow, Status } from '../../tracking/services/tracking-api'

const DOT: Record<Status, string> = { OK: 'bg-[#4d8b4f]', WARN: 'bg-[#c0902a]', CRIT: 'bg-[#b3263f]', UNKNOWN: 'bg-[#8a7a9c]', NONE: 'bg-[#cfc6cb]' }
/** Above this many tanks a small search box appears. */
const SEARCH_FROM = 12

interface Props {
  rows: OverviewRow[]
  selected: string[]
  onChange: (contents: string[]) => void
  /** Contents in `selected` that are not in `rows` (e.g. a tank that was emptied) still show, so they can be removed. */
  label?: string
  max?: number
}

/**
 * One tap per tank: compact pills with the deposit code and a status dot. Faster and quieter than a dropdown
 * with checkboxes, and it shows at a glance which tanks are being watched.
 */
export function DepositPicker({ rows, selected, onChange, label = 'Depósitos', max = 40 }: Props) {
  const [query, setQuery] = useState('')
  const filtered = rows.filter((row) => `${row.deposit} ${row.content} ${row.category ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
  const orphans = selected.filter((code) => !rows.some((row) => row.content === code))
  const toggle = (code: string) => {
    if (selected.includes(code)) onChange(selected.filter((item) => item !== code))
    else if (selected.length < max) onChange([...selected, code])
  }

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2 text-[11px] font-semibold text-muted">
        <span>{label}</span>
        <button type="button" className="font-normal text-plum hover:underline" onClick={() => onChange(rows.slice(0, max).map((row) => row.content))}>todos</button>
        <button type="button" className="font-normal text-plum hover:underline disabled:opacity-40" disabled={selected.length === 0} onClick={() => onChange([])}>ninguno</button>
        {rows.length > SEARCH_FROM && (
          <label className="ml-auto flex items-center gap-1 font-normal">
            <Search className="size-3" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar" aria-label="Buscar depósito" className="w-24 rounded-md border border-border px-1.5 py-0.5" />
          </label>
        )}
      </div>
      <div role="group" aria-label={label} className="mt-1 flex max-h-24 flex-wrap gap-1 overflow-y-auto">
        {filtered.map((row) => {
          const on = selected.includes(row.content)
          return (
            <button key={row.content} type="button" aria-pressed={on} onClick={() => toggle(row.content)} title={`${row.content}${row.category ? ` · ${row.category}` : ''}`}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${on ? 'border-plum bg-plum text-white' : 'border-border bg-white text-copy hover:bg-plum-soft'}`}>
              <span className={`size-1.5 rounded-full ${DOT[row.worstStatus]}`} aria-hidden="true" />{row.deposit}
            </button>
          )
        })}
        {orphans.map((code) => (
          <button key={code} type="button" aria-pressed onClick={() => toggle(code)} title="Ya no está en la bodega: pulsa para quitarlo" className="rounded-full border border-dashed border-plum bg-plum px-2.5 py-1 text-[11.5px] font-semibold text-white opacity-70">{code} ✕</button>
        ))}
        {rows.length === 0 && orphans.length === 0 && <span className="text-[11px] text-muted">No hay depósitos ocupados.</span>}
      </div>
    </div>
  )
}
