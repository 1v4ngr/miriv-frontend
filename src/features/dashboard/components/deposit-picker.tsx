import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import type { OverviewRow, Status } from '../../tracking/services/tracking-api'
import { LocationIcon, locationKey, locationOrder } from '../../cellar/components/deposit-badges'

const DOT: Record<Status, string> = { OK: 'bg-[#4d8b4f]', WARN: 'bg-[#c0902a]', CRIT: 'bg-[#b3263f]', UNKNOWN: 'bg-[#8a7a9c]', NONE: 'bg-[#cfc6cb]' }
/** Above this many tanks a search box appears. */
const SEARCH_FROM = 12
const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })

interface Props {
  rows: OverviewRow[]
  selected: string[]
  onChange: (contents: string[]) => void
  /** Contents in `selected` that are not in `rows` (e.g. a tank that was emptied) still show, so they can be removed. */
  label?: string
  max?: number
  /** Tailwind max-height class of the scrollable list. */
  listClassName?: string
}

/**
 * One tap per tank: light pills with the deposit code and a status dot, grouped by zone (Exterior, Interior,
 * Suelo…) when there is more than one, and each zone can be picked whole.
 */
export function DepositPicker({ rows, selected, onChange, label = 'Depósitos', max = 40, listClassName = 'max-h-56' }: Props) {
  const [query, setQuery] = useState('')
  const term = query.trim().toLowerCase()
  const filtered = rows.filter((row) => `${row.deposit} ${row.content} ${row.category ?? ''} ${row.zone ?? ''}`.toLowerCase().includes(term))
  const orphans = selected.filter((code) => !rows.some((row) => row.content === code))
  const groups = useMemo(() => {
    const byZone = new Map<string, OverviewRow[]>()
    for (const row of filtered) byZone.set(row.zone ?? '', [...(byZone.get(row.zone ?? '') ?? []), row])
    const order = (zone: string) => { const index = locationOrder.indexOf(locationKey(zone)); return zone === '' ? 99 : index === -1 ? locationOrder.length : index }
    return [...byZone.entries()]
      .sort(([a], [b]) => order(a) - order(b) || collator.compare(a, b))
      .map(([zone, items]) => ({ zone, items: items.sort((a, b) => collator.compare(a.deposit, b.deposit)) }))
  }, [filtered])

  const toggle = (code: string) => {
    if (selected.includes(code)) onChange(selected.filter((item) => item !== code))
    else if (selected.length < max) onChange([...selected, code])
  }
  const toggleGroup = (items: OverviewRow[]) => {
    const codes = items.map((row) => row.content)
    if (codes.every((code) => selected.includes(code))) onChange(selected.filter((code) => !codes.includes(code)))
    else onChange([...selected, ...codes.filter((code) => !selected.includes(code))].slice(0, max))
  }

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-[11px] font-semibold text-muted">{label}{selected.length > 0 && <span className="ml-1 font-mono font-normal">{selected.length}/{Math.min(max, rows.length + orphans.length)}</span>}</span>
        <span className="flex items-center gap-2 text-[11px]">
          <button type="button" className="font-semibold text-plum hover:underline" onClick={() => onChange([...filtered].sort((a, b) => collator.compare(a.deposit, b.deposit)).slice(0, max).map((row) => row.content))}>Todos</button>
          <span className="text-[#d6c8cf]" aria-hidden="true">·</span>
          <button type="button" className="font-semibold text-plum hover:underline disabled:text-muted disabled:no-underline" disabled={selected.length === 0} onClick={() => onChange([])}>Ninguno</button>
        </span>
        {rows.length > SEARCH_FROM && (
          <label className="ml-auto flex h-8 w-full items-center gap-1.5 rounded-lg border border-border bg-white px-2 focus-within:border-[#b9899c] sm:w-44">
            <Search className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar depósito" aria-label="Buscar depósito" className="min-w-0 flex-1 bg-transparent text-[11.5px] outline-none placeholder:text-[#9a8b92]" />
          </label>
        )}
      </div>
      <div role="group" aria-label={label} className={`mt-2 space-y-3 overflow-y-auto overscroll-contain pr-1 ${listClassName}`}>
        {groups.map(({ zone, items }) => {
          const all = items.every((row) => selected.includes(row.content))
          return (
            <div key={zone || 'none'}>
              {groups.length > 1 && (
                <div className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted">
                  <LocationIcon zone={zone} />{zone || 'Sin zona'}<span className="font-mono font-normal normal-case">{items.length}</span>
                  <button type="button" onClick={() => toggleGroup(items)} className="ml-1 font-semibold normal-case tracking-normal text-plum hover:underline">{all ? 'quitar' : 'todos'}</button>
                </div>
              )}
              <div className="flex flex-wrap gap-1">
                {items.map((row) => {
                  const on = selected.includes(row.content)
                  return (
                    <button key={row.content} type="button" aria-pressed={on} onClick={() => toggle(row.content)} title={`${row.content}${row.category ? ` · ${row.category}` : ''}`}
                      className={`flex h-7 items-center gap-1.5 rounded-lg border px-2 font-mono text-[11px] font-semibold transition-colors ${on ? 'border-plum/40 bg-plum-soft text-plum' : 'border-border bg-white text-copy hover:border-[#b9899c]'}`}>
                      {on ? <Check className="size-3" aria-hidden="true" /> : <span className={`size-1.5 rounded-full ${DOT[row.worstStatus]}`} aria-hidden="true" />}{row.deposit}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
        {orphans.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {orphans.map((code) => (
              <button key={code} type="button" aria-pressed onClick={() => toggle(code)} title="Ya no está en la bodega: pulsa para quitarlo" className="flex h-7 items-center gap-1 rounded-lg border border-dashed border-plum/50 px-2 font-mono text-[11px] font-semibold text-plum opacity-70">{code} ✕</button>
            ))}
          </div>
        )}
        {rows.length === 0 && orphans.length === 0 && <span className="text-[11px] text-muted">No hay depósitos ocupados.</span>}
        {rows.length > 0 && filtered.length === 0 && <span className="text-[11px] text-muted">Ningún depósito coincide con «{query}».</span>}
      </div>
    </div>
  )
}
