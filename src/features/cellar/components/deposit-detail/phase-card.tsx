import { useEffect, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { fermentationLabels, label as stateLabel } from '../../../../lib/labels'
import { formatDate } from '../../../../lib/format'
import { useCan } from '../../../../hooks/use-permissions'
import { CenteredModal } from '../../../../components/ui/centered-modal'
import { catalogApi, type CatalogItem } from '../../../../services/catalog-api'
import { contentDotClass } from '../deposit-badges'
import { reportsApi, type CurrentPhase, type ReportPhase } from '../../../reports/services/reports-api'
import type { Occupation } from '../../types'

type Pending = { target: ReportPhase | null; label: string }

const MUST = 'MUST'
/** States that say nothing about the alcoholic fermentation: a phase derived from them is an assumption. */
const UNKNOWN_STATES = new Set(['', 'NOT_EVALUATED', 'NOT_EVALUABLE'])
const FERMENTING = new Set(['ACTIVE', 'SLOW', 'SUSPECTED_STOP'])

/**
 * Categories the content may have in `target`, or null when its current one already fits. Mirrors the
 * backend rule: a phase that lists categories admits only those (except that a fermenting must phase also
 * admits a wine type), and a must cannot sit in a wine phase.
 */
export function requiredCategories(target: ReportPhase | null, currentCode: string | undefined, categories: CatalogItem[]): CatalogItem[] | null {
  if (!target) return null
  const active = categories.filter((item) => item.active)
  if (target.categoryCodes.length) {
    if (currentCode && target.categoryCodes.some((code) => code.toUpperCase() === currentCode.toUpperCase())) return null
    // A must phase where the alcoholic fermentation runs also admits a wine already classified by its type
    // (a red ferments as "Tinto"); only an unfermented must phase demands "Mosto".
    const fermentingMustPhase = target.categoryCodes.every((code) => code.toUpperCase() === MUST) && target.alcoholicStates.some((state) => FERMENTING.has(state.toUpperCase()))
    if (fermentingMustPhase && currentCode) return null
    return active.filter((item) => target.categoryCodes.some((code) => code.toUpperCase() === item.code.toUpperCase()))
  }
  return currentCode?.toUpperCase() === MUST ? active.filter((item) => item.code.toUpperCase() !== MUST) : null
}

/**
 * The phase the content is in, as configured in Administración › Analítica › Fases de elaboración, with every
 * active phase laid out in order. With permission the phase can be moved by hand without leaving the card:
 * the quiet arrows next to the name go one phase back or forward, and any step of the bar can be clicked.
 * Every change is confirmed in a modal (from → to, optional reason for the audit); a phase set by hand can go back to automatic.
 */
export function PhaseCard({ contentCode, current, phases, occupation, loading, onChanged }: {
  contentCode: string
  current: CurrentPhase | null
  phases: ReportPhase[]
  occupation: Occupation
  loading: boolean
  onChanged: (message: string) => void
}) {
  const canEdit = useCan('STATE_CONFIRM')
  const [pending, setPending] = useState<Pending>()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [reason, setReason] = useState('')
  const [categories, setCategories] = useState<CatalogItem[]>([])
  const [category, setCategory] = useState<string>()
  const phase = current?.phase ?? null
  const currentCategory = categories.find((item) => item.name === occupation.category)
  const options = requiredCategories(pending?.target ?? null, currentCategory?.code, categories)

  useEffect(() => { if (pending && !categories.length) catalogApi.getInternalCategories().then(setCategories).catch(() => setError('No se han podido cargar las categorías.')) }, [pending, categories.length])
  // A single admissible category is chosen for the user; several need an explicit choice.
  useEffect(() => { setCategory(options?.length === 1 ? options[0].code : undefined) }, [pending, options?.map((item) => item.code).join(',')]) // eslint-disable-line react-hooks/exhaustive-deps
  const index = phase ? phases.findIndex((item) => item.id === phase.id) : -1
  const previous = index > 0 ? phases[index - 1] : undefined
  const next = index >= 0 ? phases[index + 1] : phases[0]

  const ask = (target: ReportPhase) => { if (target.id !== phase?.id) { setError(''); setReason(''); setPending({ target, label: `Pasar a ${target.name}` }) } }
  const close = () => { if (!saving) { setPending(undefined); setError('') } }
  const confirm = async () => {
    if (!pending) return
    setSaving(true); setError('')
    try {
      const result = await reportsApi.setCurrentPhase(contentCode, pending.target?.id ?? null, reason.trim() || undefined, options ? category : undefined)
      const newCategory = options ? categories.find((item) => item.code === category)?.name : undefined
      onChanged(pending.target ? `${contentCode} pasa a ${pending.target.name}${newCategory ? ` y a ${newCategory}` : ''}.` : `${contentCode} vuelve a la fase automática${result.phase ? ` (${result.phase.name})` : ''}.`)
      setPending(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido cambiar la fase.')
    } finally { setSaving(false) }
  }

  const arrow = 'flex size-9 sm:size-7 items-center justify-center rounded-lg text-muted transition hover:bg-plum-soft hover:text-plum disabled:pointer-events-none disabled:opacity-25'

  return (
    <div className="group/phase order-last col-span-2 min-w-0 rounded-2xl border border-border bg-white px-3.5 py-3 sm:px-4 lg:order-none">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-[11px] text-muted">Fase</span>
        <span className="order-last w-full truncate text-[10.5px] text-muted sm:order-none sm:w-auto">FA {stateLabel(fermentationLabels, occupation.alcoholicState).toLocaleLowerCase('es')} · FML {stateLabel(fermentationLabels, occupation.malolacticState).toLocaleLowerCase('es')}</span>
      </div>

      <div className="mt-0.5 flex items-center gap-2">
        {phase && <span className="size-2.5 shrink-0 rounded-full transition-colors" style={{ background: phase.color }} aria-hidden="true" />}
        <span className="truncate text-[16px] font-semibold text-ink">{loading ? '…' : phase?.name ?? 'Sin fase asignada'}</span>
        {!loading && phase && !current?.manual && UNKNOWN_STATES.has(occupation.alcoholicState ?? '') && (
          <span className="shrink-0 text-[10.5px] text-muted" title="No hay un estado de fermentación alcohólica registrado: la fase se ha supuesto con la categoría y los criterios de las fases. Confirma el estado o fija la fase a mano.">· supuesta</span>
        )}
        {current?.manual && (
          <span className="flex shrink-0 items-center gap-1 text-[10.5px] text-muted" title={`Fijada a mano${current.changedBy ? ` por ${current.changedBy}` : ''}${current.changedAt ? ` el ${formatDate(current.changedAt)}` : ''}. Automática: ${current.automatic?.name ?? 'sin fase'}.`}>
            · manual
            {canEdit && <button type="button" onClick={() => { setError(''); setReason(''); setPending({ target: null, label: 'Volver a la fase automática' }) }} className="flex items-center gap-0.5 rounded px-1 text-plum opacity-0 transition hover:underline focus-visible:opacity-100 group-hover/phase:opacity-100 [@media(hover:none)]:opacity-100"><RotateCcw className="size-3" aria-hidden="true" />automática</button>}
          </span>
        )}
        {canEdit && !loading && phases.length > 1 && (
          <span className="ml-auto flex shrink-0 items-center">
            <button type="button" onClick={() => previous && ask(previous)} disabled={!previous || saving} aria-label={previous ? `Volver a ${previous.name}` : 'No hay fase anterior'} title={previous ? `Volver a ${previous.name}` : undefined} className={arrow}><ChevronLeft className="size-4" /></button>
            <button type="button" onClick={() => next && ask(next)} disabled={!next || saving} aria-label={next ? `Avanzar a ${next.name}` : 'No hay fase siguiente'} title={next ? `Avanzar a ${next.name}` : undefined} className={arrow}><ChevronRight className="size-4" /></button>
          </span>
        )}
      </div>

      {phases.length > 1 && (
        <ol className="mt-1 flex gap-1 sm:mt-2.5" aria-label="Fases de elaboración">
          {phases.map((item, position) => {
            const isCurrent = position === index
            const past = index >= 0 && position < index
            const isPending = pending?.target?.id === item.id
            // A progress bar in the colour of the current phase: steps behind are a light tint of it, so no
            // earlier phase reads as the current one; a step being hovered or chosen previews its own colour.
            const tone = isCurrent ? 'bg-[var(--current)]' : isPending ? 'bg-[var(--phase)]' : past ? 'bg-[var(--current)] opacity-30' : 'bg-[#eee6ea]'
            const bar = <span className={`block h-1.5 rounded-full transition duration-200 group-hover/step:bg-[var(--phase)] group-hover/step:opacity-60 ${tone}`} style={{ ['--phase' as string]: item.color, ['--current' as string]: phase?.color ?? item.color }} />
            const name = <span className={`mt-1 hidden truncate text-[10px] sm:block transition-colors group-hover/step:text-copy ${isCurrent ? 'font-semibold text-ink' : isPending ? 'text-ink' : 'text-muted'}`}>{item.name}</span>
            return (
              <li key={item.id} className="min-w-0 flex-1" aria-current={isCurrent ? 'step' : undefined}>
                {canEdit && !isCurrent
                  ? <button type="button" onClick={() => ask(item)} disabled={saving} title={`Pasar a ${item.name}${item.description ? ` — ${item.description}` : ''}`} className="group/step block w-full cursor-pointer rounded py-2 text-left outline-none sm:py-0 focus-visible:ring-2 focus-visible:ring-[#e3cdd8]">{bar}{name}</button>
                  : <div title={item.description ?? item.name} className="py-2 sm:py-0">{bar}{name}</div>}
              </li>
            )
          })}
        </ol>
      )}

      {!loading && !phase && <p className="mt-1 text-[10.5px] text-muted">Ninguna fase configurada coincide con la categoría y los estados de este contenido.</p>}

      <CenteredModal open={Boolean(pending)} size="sm" title={pending?.label ?? ''} subtitle={`Contenido ${contentCode}`} onClose={close}
        secondaryLabel="Cancelar" onSecondary={close} primaryLabel={saving ? 'Guardando…' : pending?.target ? 'Cambiar fase' : 'Volver a automática'} primaryDisabled={saving || (Boolean(options) && !category)} onPrimary={confirm}>
        {pending && (() => {
          const target = pending.target ?? current?.automatic ?? null
          return (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-[#fdfbfc] p-3">
                <PhasePill phase={phase} />
                <ArrowRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
                <PhasePill phase={target} strong />
              </div>
              {target?.description && <p className="text-[12px] leading-5 text-copy">{target.description}</p>}
              {target && target.parameterCodes.length > 0 && <p className="text-[11.5px] text-muted">El detalle del depósito pasará a destacar sus parámetros.</p>}
              {options && (
                <div className="rounded-xl border border-[#e3cdd8] bg-[#fdf8fa] p-3">
                  <p className="text-[12px] font-semibold text-ink">Cambia también la categoría</p>
                  <p className="mt-0.5 text-[11.5px] text-copy">{currentCategory?.code.toUpperCase() === MUST ? `Un mosto no puede estar en ${pending.target?.name}: elige en qué vino se convierte.` : `${pending.target?.name} es para ${options.map((item) => item.name.toLocaleLowerCase('es')).join(' o ')}; ${occupation.category ? `no puede seguir como ${occupation.category.toLocaleLowerCase('es')}` : 'hace falta una categoría'}.`}</p>
                  <div role="radiogroup" aria-label="Nueva categoría" className="mt-2.5 flex flex-wrap gap-1.5">
                    {options.map((item) => (
                      <button key={item.code} type="button" role="radio" aria-checked={category === item.code} onClick={() => setCategory(item.code)}
                        className={`flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] font-medium transition-colors ${category === item.code ? 'border-plum/50 bg-plum-soft text-plum' : 'border-border bg-white text-copy hover:border-[#b9899c]'}`}>
                        <span className={`size-2 rounded-full ${contentDotClass(item.name)}`} aria-hidden="true" />{occupation.category && options.length === 1 ? `${occupation.category} → ${item.name}` : item.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <label className="block text-[12px] font-semibold text-copy">Motivo <span className="font-normal text-muted">(opcional)</span>
                <textarea rows={2} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder={pending.target ? 'Densidad estable, azúcares por debajo de 2 g/L' : 'Los estados de fermentación ya están al día'} className="mt-1.5 w-full rounded-xl border border-border bg-white p-2.5 text-[12.5px] font-normal outline-none focus:border-[#b9899c]" />
              </label>
              <p className="text-[11px] text-muted">{pending.target ? 'La fase quedará fijada a mano hasta que la cambies o vuelvas a la automática.' : 'La fase se volverá a calcular con la categoría y los estados de fermentación.'} El cambio queda registrado.</p>
              {error && <p role="alert" className="rounded-lg bg-[#f7e0e6] px-3 py-2 text-[12px] text-[#8e1f33]">{error}</p>}
            </div>
          )
        })()}
      </CenteredModal>
    </div>
  )
}

function PhasePill({ phase, strong = false }: { phase: ReportPhase | null; strong?: boolean }) {
  return (
    <span className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 py-2 text-[12px] ${strong ? 'border-[#e3cdd8] bg-white font-semibold text-ink' : 'border-transparent text-muted'}`}>
      <span className="size-2.5 shrink-0 rounded-full" style={{ background: phase?.color ?? '#d6c8cf' }} aria-hidden="true" />
      <span className="truncate">{phase?.name ?? 'Sin fase'}</span>
    </span>
  )
}
