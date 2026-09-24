import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, Cylinder, Tag, X } from 'lucide-react'
import type { Period } from '../../tracking/favorites'
import { PERIODS } from '../../tracking/period'
import { useDashboardContext } from '../dashboard-context'
import { DepositPicker } from './deposit-picker'

/** Up to this many selected tanks are listed as pills in the bar; beyond it, just the count. */
const INLINE_PILLS = 4

const inlineSelect = 'h-9 appearance-none rounded-xl border border-border bg-white pl-8 pr-7 text-[12px] font-medium text-copy outline-none transition-colors hover:border-[#b9899c] focus-visible:border-[#b9899c]'

/**
 * One line: a "Depósitos" button that opens the picker in a panel, the current selection as removable pills,
 * then period and category. Shared by every panel that follows the global filters.
 */
export function GlobalFilterBar() {
  const { globals, setGlobals, overview } = useDashboardContext()
  const rows = overview?.rows ?? []
  const categories = [...new Set(rows.map((row) => row.category).filter((value): value is string => !!value))].sort()
  const active = globals.contents.length > 0 || globals.category !== '' || globals.period !== '30'
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const depositOf = (content: string) => rows.find((row) => row.content === content)?.deposit ?? content
  const setContents = (contents: string[]) => setGlobals({ ...globals, contents })

  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => { if (!pickerRef.current?.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [open])

  const count = globals.contents.length

  return (
    <section aria-label="Filtros globales" className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-white p-2">
      <div ref={pickerRef} className="relative">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog"
          className={`flex h-9 items-center gap-2 rounded-xl border px-3 text-[12px] font-semibold transition-colors ${open || count ? 'border-plum/40 bg-plum-soft text-plum' : 'border-border bg-white text-copy hover:border-[#b9899c]'}`}>
          <Cylinder className="size-4" aria-hidden="true" />Depósitos
          {count > 0 && <span className="rounded-full bg-plum px-1.5 font-mono text-[10px] leading-4 text-white">{count}</span>}
          <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
        {open && (
          <div role="dialog" aria-label="Elegir depósitos" className="absolute left-0 top-full z-30 mt-2 w-[min(calc(100vw-2rem),560px)] rounded-2xl border border-border bg-white p-4 shadow-[0_12px_32px_rgba(46,38,42,0.14)]">
            <DepositPicker rows={rows} selected={globals.contents} onChange={setContents} label="Depósitos globales" listClassName="max-h-[340px]" />
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
              <p className="text-[11px] text-muted">{count ? 'Los paneles que siguen los filtros globales muestran estos depósitos.' : 'Sin selección, cada panel usa sus propios depósitos.'}</p>
              <button type="button" onClick={() => setOpen(false)} className="h-8 shrink-0 rounded-lg bg-plum px-3 text-[11.5px] font-semibold text-white hover:bg-plum-dark">Hecho</button>
            </div>
          </div>
        )}
      </div>

      {count === 0 && <span className="px-1 text-[11.5px] text-muted">Cada panel con sus depósitos</span>}
      {count > 0 && count <= INLINE_PILLS && globals.contents.map((content) => (
        <span key={content} className="inline-flex h-7 items-center gap-1 rounded-lg border border-border bg-white pl-2 pr-0.5 font-mono text-[11px] font-semibold text-copy">
          {depositOf(content)}
          <button type="button" onClick={() => setContents(globals.contents.filter((item) => item !== content))} aria-label={`Quitar ${depositOf(content)}`} className="rounded-md p-0.5 text-muted hover:bg-plum-soft hover:text-plum"><X className="size-3" /></button>
        </span>
      ))}
      {count > INLINE_PILLS && (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-7 items-center rounded-lg px-2 text-[11.5px] text-copy hover:bg-plum-soft hover:text-plum" title={globals.contents.map(depositOf).join(', ')}>
          <span className="font-mono font-semibold">{globals.contents.slice(0, 3).map(depositOf).join(', ')}</span><span className="ml-1 text-muted">y {count - 3} más</span>
        </button>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <label className="relative">
          <span className="sr-only">Periodo</span>
          <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
          <select value={globals.period} onChange={(event) => setGlobals({ ...globals, period: event.target.value as Period })} className={inlineSelect}>
            {PERIODS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
        </label>
        {categories.length > 1 && (
          <label className="relative">
            <span className="sr-only">Categoría</span>
            <Tag className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <select value={globals.category} onChange={(event) => setGlobals({ ...globals, category: event.target.value })} className={`${inlineSelect} ${globals.category ? 'border-plum/40 bg-plum-soft text-plum' : ''}`}>
              <option value="">Todas las categorías</option>{categories.map((category) => <option key={category}>{category}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted" aria-hidden="true" />
          </label>
        )}
        {active && <button type="button" onClick={() => setGlobals({ period: '30', contents: [], category: '' })} className="flex h-9 items-center gap-1 rounded-xl px-2 text-[12px] font-semibold text-muted hover:text-plum"><X className="size-3.5" />Limpiar</button>}
      </div>
    </section>
  )
}
