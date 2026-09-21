import { useEffect, useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { CenteredModal } from '../../../components/ui/centered-modal'

/** Minimum shape expected for a deposit in the picker. The active deposits are flatMapped down to this. */
export interface DepositPickerItem {
  code: string
  contentCode?: string
  lotCode?: string
  category?: string
}

interface DepositPickerModalProps {
  open: boolean
  title?: string
  subtitle?: string
  deposits: DepositPickerItem[]
  /** Initial selection (e.g. the deposit already chosen when the user opened the form by deposit). */
  preSelected?: string
  /** Optional placeholder for the search input. */
  searchPlaceholder?: string
  confirmLabel?: string
  /** When false (default) the user picks exactly one deposit and the modal closes on click. */
  multiple?: boolean
  onClose: () => void
  /** Single-select returns one code; multi returns the codes (capped at one for the typical use). */
  onPick: (codes: string[] | string | null) => void
}

/** Foreground modal for picking the deposit a sample comes from. Search by code, content or lot. */
export function DepositPickerModal({
  open, title = 'Elegir depósito de toma', subtitle,
  deposits, preSelected, searchPlaceholder = 'Buscar por código, contenido o lote…',
  confirmLabel, multiple = false, onClose, onPick,
}: DepositPickerModalProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(() => new Set(preSelected ? [preSelected] : []))

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(new Set(preSelected ? [preSelected] : []))
    }
  }, [open, preSelected])

  const candidates = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (!text) return deposits
    return deposits.filter((deposit) => {
      const haystack = `${deposit.code} ${deposit.contentCode ?? ''} ${deposit.lotCode ?? ''} ${deposit.category ?? ''}`.toLowerCase()
      return haystack.includes(text)
    })
  }, [deposits, query])

  const choose = (code: string) => {
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

  const label = confirmLabel ?? (multiple ? `Seleccionar ${selected.size || ''}`.trim() : undefined)
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
            placeholder={searchPlaceholder}
            aria-label="Buscar depósito"
            className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-plum"
          />
        </label>

        {deposits.length === 0 && (
          <p role="alert" className="rounded-xl bg-[#f5e4da] p-3 text-xs text-[#7a4a22]">
            No hay ningún depósito con contenido activo ahora mismo. Registra un lote con entrada en bodega antes de tomar una muestra.
          </p>
        )}

        {deposits.length > 0 && nothingFound && (
          <p className="rounded-xl border border-dashed border-border bg-[#fdfbfc] p-3 text-center text-xs text-muted">
            Ningún depósito coincide con «{query.trim()}».
          </p>
        )}

        {deposits.length > 0 && !nothingFound && candidates.length === 0 && (
          <p className="rounded-xl border border-dashed border-border bg-[#fdfbfc] p-3 text-center text-xs text-muted">
            Sin depósitos disponibles.
          </p>
        )}

        {candidates.length > 0 && (
          <ul role="listbox" aria-multiselectable={multiple}
            className="max-h-[50vh] space-y-1 overflow-y-auto rounded-xl border border-border bg-[#fdfbfc] p-1">
            {candidates.map((deposit) => {
              const checked = selected.has(deposit.code)
              const meta = [deposit.contentCode, deposit.lotCode, deposit.category].filter(Boolean).join(' · ')
              return (
                <li key={deposit.code}>
                  <button
                    type="button"
                    role={multiple ? 'checkbox' : 'option'}
                    aria-checked={multiple ? checked : undefined}
                    aria-selected={!multiple ? checked : undefined}
                    onClick={() => choose(deposit.code)}
                    className={`flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      checked ? 'bg-plum-soft' : 'hover:bg-field'
                    }`}
                  >
                    <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border ${
                      checked ? 'border-plum bg-plum text-white' : 'border-border bg-white text-transparent'
                    }`} aria-hidden="true">
                      <Check className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-mono text-base font-semibold tracking-wide text-copy">{deposit.code}</span>
                      {meta ? (
                        <span className="mt-0.5 block text-[11px] text-muted">{meta}</span>
                      ) : (
                        <span className="mt-0.5 block text-[11px] text-muted">Sin contenido activo ahora mismo.</span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        {multiple && deposits.length > 0 && (
          <p className="text-[11px] text-muted">
            {selected.size === 0
              ? 'Marca uno o varios depósitos.'
              : `${selected.size} ${selected.size === 1 ? 'depósito seleccionado' : 'depósitos seleccionados'}.`}
          </p>
        )}
      </div>
    </CenteredModal>
  )
}
