import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'

export interface MultiSelectOption { value: string; label: string; hint?: string }

interface Props {
  label: string
  options: MultiSelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  /** Shows "Todos" / "Ninguno" shortcuts. */
  bulk?: boolean
  max?: number
}

/** Chips + searchable dropdown; no external dependency. */
export function MultiSelect({ label, options, selected, onChange, placeholder = 'Elegir…', bulk = false, max }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const byValue = useMemo(() => new Map(options.map((option) => [option.value, option])), [options])
  const visible = options.filter((option) => `${option.label} ${option.hint ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
  const toggle = (value: string) => {
    if (selected.includes(value)) onChange(selected.filter((item) => item !== value))
    else if (max === undefined || selected.length < max) onChange([...selected, value])
  }

  return (
    <div ref={root} className="relative min-w-0">
      <span className="text-[11px] font-semibold text-muted">{label}</span>
      <div className="mt-1 flex min-h-9 flex-wrap items-center gap-1 rounded-xl border border-border bg-white px-2 py-1">
        {selected.map((value) => (
          <span key={value} className="flex items-center gap-1 rounded-full bg-plum-soft px-2 py-0.5 text-[11px] font-semibold text-plum">
            {byValue.get(value)?.label ?? value}
            <button type="button" aria-label={`Quitar ${byValue.get(value)?.label ?? value}`} onClick={() => onChange(selected.filter((item) => item !== value))}><X className="size-3" /></button>
          </span>
        ))}
        <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="ml-auto flex items-center gap-1 px-1 text-[11px] text-muted">
          {selected.length === 0 ? placeholder : 'Añadir'}<ChevronDown className="size-3.5" />
        </button>
      </div>
      {open && (
        <div className="absolute z-20 mt-1 w-full min-w-[240px] rounded-xl border border-border bg-white p-2 shadow-lg">
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar…" className="w-full rounded-lg border border-border px-2 py-1.5 text-xs" />
          {bulk && (
            <div className="mt-1 flex gap-3 px-1 text-[11px] font-semibold text-plum">
              <button type="button" onClick={() => onChange(visible.slice(0, max ?? visible.length).map((option) => option.value))}>Todos</button>
              <button type="button" onClick={() => onChange([])}>Ninguno</button>
            </div>
          )}
          <ul className="mt-1 max-h-60 overflow-y-auto" role="listbox" aria-multiselectable="true">
            {visible.length === 0 && <li className="px-2 py-2 text-xs text-muted">Sin resultados</li>}
            {visible.map((option) => {
              const checked = selected.includes(option.value)
              return (
                <li key={option.value} role="option" aria-selected={checked}>
                  <button type="button" onClick={() => toggle(option.value)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-plum-soft">
                    <span className={`flex size-4 shrink-0 items-center justify-center rounded border ${checked ? 'border-plum bg-plum text-white' : 'border-border'}`}>{checked && <Check className="size-3" />}</span>
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.hint && <span className="shrink-0 text-[10.5px] text-muted">{option.hint}</span>}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
