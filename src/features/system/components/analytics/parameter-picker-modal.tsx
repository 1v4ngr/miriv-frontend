import { useEffect, useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { CenteredModal } from '../../../../components/ui/centered-modal'

/** Minimum required shape of a parameter in the picker. Both `ParameterView` and `ParameterInfo` satisfy it. */
export interface PickerParameter {
  code: string
  name: string
  unit?: string | null
  active?: boolean
  description?: string | null
}

interface ParameterPickerModalProps {
  open: boolean
  /** Title at the top of the modal. */
  title?: string
  /** Optional helper text below the title. */
  subtitle?: string
  /** Parameters that can be picked. */
  parameters: Array<PickerParameter>
  /** Set of codes that should appear pre-checked (for example parameters already in a template). */
  preSelected?: Set<string>
  /** If provided, parameters whose code is in this set are hidden; useful for "not yet added". */
  exclude?: Set<string>
  /** Show only parameters flagged `active` (defaults to true). Parameters without `active` are treated as active. */
  activeOnly?: boolean
  /** Controls whether the user can pick more than one. */
  multiple?: boolean
  /** Initial text for the search box. */
  initialQuery?: string
  /** Footer action label; defaults to a count-aware "Añadir". */
  confirmLabel?: string
  onClose: () => void
  /** Single-select returns one code; multi returns the codes. */
  onPick: (codes: string[] | string | null) => void
}

/** Foreground modal for picking one or many parameters, with a search box and inline metadata. */
export function ParameterPickerModal({
  open, title = 'Elegir parámetro', subtitle, parameters,
  preSelected, exclude, activeOnly = true, multiple = true,
  initialQuery = '', confirmLabel, onClose, onPick,
}: ParameterPickerModalProps) {
  const [query, setQuery] = useState(initialQuery)
  const [selected, setSelected] = useState<Set<string>>(() => new Set(preSelected ?? []))

  useEffect(() => {
    if (open) {
      setQuery(initialQuery)
      setSelected(new Set(preSelected ?? []))
    }
  }, [open, initialQuery, preSelected])

  const candidates = useMemo(() => {
    const ex = exclude ?? null
    const text = query.trim().toLowerCase()
    return parameters.filter((parameter) => {
      if (activeOnly && parameter.active === false) return false
      if (ex && ex.has(parameter.code)) return false
      if (!text) return true
      const haystack = `${parameter.name} ${parameter.code} ${parameter.unit ?? ''} ${parameter.description ?? ''}`.toLowerCase()
      return haystack.includes(text)
    })
  }, [parameters, activeOnly, exclude, query])

  const toggle = (code: string) => {
    if (!multiple) {
      onPick(code)
      onClose()
      return
    }
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const confirm = () => {
    if (selected.size === 0) return
    onPick(Array.from(selected))
    onClose()
  }

  const label = confirmLabel ?? (multiple ? `Añadir ${selected.size || ''}`.trim() : 'Seleccionar')
  const nothingFound = candidates.length === 0 && query.trim() !== ''

  return (
    <CenteredModal
      open={open}
      size="md"
      title={title}
      subtitle={subtitle}
      primaryLabel={multiple ? label : undefined}
      primaryDisabled={multiple && selected.size === 0}
      onPrimary={multiple ? confirm : undefined}
      onClose={onClose}
    >
      <div className="space-y-3">
        <label className="relative flex min-h-10 items-center">
          <Search className="pointer-events-none absolute left-3 size-4 text-muted" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar parámetro por nombre, código o unidad…"
            aria-label="Buscar parámetro"
            className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-plum"
          />
        </label>

        <ul role="listbox" aria-multiselectable={multiple}
          className="max-h-[50vh] space-y-1 overflow-y-auto rounded-xl border border-border bg-[#fdfbfc] p-1">
          {nothingFound && (
            <li className="px-3 py-6 text-center text-xs text-muted">
              Ningún parámetro coincide con «{query.trim()}».
            </li>
          )}
          {!nothingFound && candidates.length === 0 && (
            <li className="px-3 py-6 text-center text-xs text-muted">
              No hay parámetros disponibles para añadir.
            </li>
          )}
          {candidates.map((parameter) => {
            const checked = selected.has(parameter.code)
            return (
              <li key={parameter.code}>
                <button
                  type="button"
                  role={multiple ? 'checkbox' : 'option'}
                  aria-checked={multiple ? checked : undefined}
                  aria-selected={!multiple ? checked : undefined}
                  onClick={() => toggle(parameter.code)}
                  className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left text-xs transition ${
                    checked ? 'bg-plum-soft' : 'hover:bg-field'
                  }`}
                >
                  <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${
                    checked ? 'border-plum bg-plum text-white' : 'border-border bg-white text-transparent'
                  }`} aria-hidden="true">
                    <Check className="size-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-copy">{parameter.name}</span>
                    <span className="mt-0.5 block font-mono text-[10.5px] text-muted">
                      {parameter.code}{parameter.unit ? ` · ${parameter.unit}` : ''}
                    </span>
                    {parameter.description && (
                      <span className="mt-0.5 block text-[11px] text-muted">{parameter.description}</span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {multiple && (
          <p className="text-[11px] text-muted">
            {selected.size === 0
              ? 'Marca uno o varios parámetros para añadirlos.'
              : `${selected.size} ${selected.size === 1 ? 'parámetro seleccionado' : 'parámetros seleccionados'}.`}
          </p>
        )}
      </div>
    </CenteredModal>
  )
}
