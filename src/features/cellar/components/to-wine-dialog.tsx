import { useEffect, useState, type FormEvent } from 'react'
import { Wine, X } from 'lucide-react'
import { catalogApi, type CatalogItem } from '../../../services/catalog-api'
import { panelsApi, type PanelView } from '../../laboratory/services/panels-api'
import { contentApi, type ContentRecord } from '../services/content-api'

/** Mosto is the only "not yet wine" category; everything else it can become is a wine category. */
export const isMust = (category?: string | null) => (category ?? '').trim().toLowerCase() === 'mosto'

const EVIDENCE = ['Densidad', 'Azúcares reductores', 'Glucosa más fructosa', 'Etanol']

/**
 * The end of the alcoholic fermentation in one step: confirms it as finished and turns the must into the
 * wine it has become. From then on the deposit proposes that wine's analysis template, so the next
 * samples ask for wine parameters without anyone having to remember it.
 */
export function ToWineDialog({ content, onClose, onDone }: {
  content: ContentRecord
  onClose: () => void
  onDone: (message: string) => void
}) {
  const [categories, setCategories] = useState<CatalogItem[]>([])
  const [category, setCategory] = useState<CatalogItem>()
  const [template, setTemplate] = useState<PanelView>()
  const [reason, setReason] = useState('Fermentación alcohólica terminada')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const latest = content.samples[0]
  const evidence = (latest?.results ?? []).filter((result) => EVIDENCE.includes(result.parameter))

  useEffect(() => {
    catalogApi.getInternalCategories()
      .then((items) => {
        const wines = items.filter((item) => item.active && !isMust(item.name))
        setCategories(wines)
        // The lot's own category is the natural proposal when it is already a wine category.
        const proposal = wines.find((item) => item.name === content.lot?.category)
        if (proposal) setCategory(proposal)
      })
      .catch(() => setError('No se han podido cargar las categorías.'))
  }, [content.lot?.category])

  useEffect(() => {
    if (!category) { setTemplate(undefined); return }
    panelsApi.panels(category.code).then((items) => setTemplate(items[0])).catch(() => setTemplate(undefined))
  }, [category])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!category) { setError('Elige en qué vino se convierte.'); return }
    setSaving(true); setError('')
    try {
      await contentApi.reviewState(content.code, { process: 'alcoholic', decision: 'FINISHED', reason: reason.trim(), newCategory: category.code })
      onDone(`${content.code} pasa a ${category.name}.${template ? ` Los próximos análisis usarán «${template.name}».` : ''}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido completar el cambio.')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}>
      <form role="dialog" aria-modal="true" aria-labelledby="to-wine-title" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}
        className="h-full w-full max-w-[460px] space-y-4 overflow-y-auto bg-[#fdfbfc] p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 id="to-wine-title" className="flex items-center gap-2 text-lg font-semibold"><Wine className="size-5 text-plum" />Pasar a vino</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-plum-soft"><X className="size-4" /></button>
        </div>
        <p className="text-xs text-muted">
          Da por terminada la fermentación alcohólica de <strong className="font-mono">{content.code}</strong> ({content.deposit.code}) y
          lo reclasifica como vino. Queda registrado con el motivo.
        </p>

        {latest && (
          <div className="rounded-xl border border-border bg-white p-3 text-xs">
            <p className="font-semibold">Último análisis · {latest.takenAt?.replace('T', ' ').slice(0, 16)}</p>
            {evidence.length ? (
              <dl className="mt-2 grid grid-cols-2 gap-2">
                {evidence.map((result) => (
                  <div key={result.parameter}><dt className="text-[11px] text-muted">{result.parameter}</dt>
                    <dd className="font-semibold">{result.qualifier ? `${result.qualifier} ${result.limit ?? ''}` : result.value} {result.unit}</dd></div>
                ))}
              </dl>
            ) : <p className="mt-1 text-muted">Sin densidad ni azúcares en el último análisis.</p>}
          </div>
        )}

        <fieldset>
          <legend className="text-xs font-semibold">¿En qué vino se convierte? *</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {categories.map((item) => (
              <button key={item.code} type="button" onClick={() => setCategory(item)} aria-pressed={category?.code === item.code}
                className={`min-h-12 rounded-xl border px-3 text-sm font-semibold transition ${category?.code === item.code ? 'border-plum bg-plum text-white' : 'border-border bg-white text-copy hover:border-plum'}`}>
                {item.name}
              </button>
            ))}
          </div>
        </fieldset>

        {category && (
          <p className="rounded-xl bg-plum-soft p-3 text-xs text-plum">
            {template
              ? <>Los próximos análisis de este depósito usarán la plantilla <strong>«{template.name}»</strong> ({template.parameters.length} parámetros).</>
              : <>{category.name} no tiene plantilla de análisis asignada: puedes asignarla en Administración → Plantillas de análisis.</>}
          </p>
        )}

        <label className="block text-xs font-semibold">Motivo *
          <textarea required rows={3} value={reason} onChange={(event) => setReason(event.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-white p-2.5 font-normal" />
        </label>
        {error && <p role="alert" className="rounded-xl bg-[#f7dadf] p-2.5 text-xs text-[#8e1f33]">{error}</p>}
        <button disabled={saving || !category} className="min-h-11 w-full rounded-xl bg-plum text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Guardando…' : category ? `Pasar a ${category.name}` : 'Elige el tipo de vino'}
        </button>
      </form>
    </div>
  )
}
