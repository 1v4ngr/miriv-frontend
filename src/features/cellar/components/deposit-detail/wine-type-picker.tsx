import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { catalogApi, type CatalogItem } from '../../../../services/catalog-api'
import { useCan } from '../../../../hooks/use-permissions'
import { contentApi } from '../../services/content-api'
import { ContentBadge, contentDotClass } from '../deposit-badges'

// The three wine types offered, in the order the cellar reads them.
const WINE_TYPES = ['WHITE', 'RED', 'ROSE']

/**
 * The wine type of the current content, shown as its coloured badge in the deposit header. With permission
 * the badge opens a small menu (Blanco / Tinto / Rosado); picking one asks for a confirmation and changes
 * the content's category, which the backend audits with the previous value.
 */
export function WineTypePicker({ contentCode, category, onChanged }: { contentCode: string; category: string | null; onChanged: (message: string) => void }) {
  const canEdit = useCan('CONTENT_CORRECT')
  const [open, setOpen] = useState(false)
  const [types, setTypes] = useState<CatalogItem[]>([])
  const [pending, setPending] = useState<CatalogItem>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || types.length) return
    catalogApi.getInternalCategories()
      .then((items) => setTypes(WINE_TYPES.map((code) => items.find((item) => item.active && item.code === code)).filter((item): item is CatalogItem => Boolean(item))))
      .catch(() => setError('No se han podido cargar los tipos.'))
  }, [open, types.length])

  useEffect(() => {
    if (!open) return
    const close = () => { setOpen(false); setPending(undefined); setError('') }
    const onPointer = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) close() }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [open])

  const confirm = async () => {
    if (!pending) return
    setSaving(true); setError('')
    try {
      await contentApi.changeCategory(contentCode, pending.code)
      onChanged(`${contentCode} pasa a ${pending.name}.`)
      setOpen(false); setPending(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido cambiar el tipo.')
    } finally { setSaving(false) }
  }

  if (!canEdit) return <ContentBadge category={category} />

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} title="Cambiar tipo de vino" className="group flex items-center gap-0.5 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#e3cdd8]">
        <ContentBadge category={category} />
        <ChevronDown className={`size-3.5 text-muted transition group-hover:text-plum ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" aria-label="Tipo de vino" className="absolute left-0 top-full z-30 mt-2 w-60 rounded-2xl border border-border bg-white p-1.5 shadow-[0_12px_32px_rgba(46,38,42,0.14)]">
          <p className="px-2.5 pb-1.5 pt-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted">Tipo de vino</p>
          {types.map((item) => {
            const current = item.name === category
            const chosen = pending?.code === item.code
            return (
              <button key={item.code} type="button" role="menuitemradio" aria-checked={current} disabled={saving} onClick={() => setPending(current ? undefined : item)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-medium transition-colors ${chosen ? 'bg-plum-soft text-plum' : 'text-ink hover:bg-[#f7f1f4]'}`}>
                <span className={`size-2.5 rounded-full ${contentDotClass(item.name)}`} aria-hidden="true" />
                <span className="flex-1">{item.name}</span>
                {current && <Check className="size-3.5 text-plum" aria-label="Actual" />}
              </button>
            )
          })}
          {category && !types.some((item) => item.name === category) && types.length > 0 && <p className="px-2.5 py-1.5 text-[11px] text-muted">Ahora es <strong className="text-copy">{category}</strong>.</p>}
          {pending && (
            <div className="mt-1 border-t border-border px-2.5 pb-1 pt-2.5">
              <p className="text-[11.5px] text-copy">¿Cambiar {category ? <>de <strong>{category}</strong> </> : ''}a <strong>{pending.name}</strong>?</p>
              <div className="mt-2 flex justify-end gap-1.5">
                <button type="button" onClick={() => setPending(undefined)} disabled={saving} className="h-8 rounded-lg px-2.5 text-[11.5px] font-semibold text-muted hover:text-ink">Cancelar</button>
                <button type="button" onClick={confirm} disabled={saving} className="h-8 rounded-lg bg-plum px-3 text-[11.5px] font-semibold text-white hover:bg-plum-dark disabled:opacity-60">{saving ? 'Guardando…' : 'Cambiar'}</button>
              </div>
            </div>
          )}
          {error && <p role="alert" className="px-2.5 py-1.5 text-[11px] text-[#8e3b4a]">{error}</p>}
        </div>
      )}
    </div>
  )
}
