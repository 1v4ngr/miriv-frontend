import { useEffect, useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import { CenteredModal } from '../../../components/ui/centered-modal'
import { useResource } from '../../../hooks/use-resource'
import { fermentationLabels } from '../../../lib/labels'
import { catalogApi } from '../../../services/catalog-api'
import { ParameterPickerModal } from '../../system/components/analytics/parameter-picker-modal'
import { trackingApi } from '../../tracking/services/tracking-api'
import { reportsApi, type ReportPhase, type ReportPhaseInput } from '../services/reports-api'
import { ALCOHOLIC_STATES, MALOLACTIC_STATES } from '../utils'

const card = 'rounded-2xl border border-border bg-white p-4'
const input = 'w-full rounded-xl border border-border bg-white px-2.5 py-2 text-xs font-normal outline-none focus:border-plum'
const stateLabel = (code: string) => (code === 'NONE' ? 'Sin estado' : fermentationLabels[code] ?? code)

const EMPTY: ReportPhaseInput = {
  name: '', description: null, color: '#6d4656', active: true,
  categoryCodes: [], alcoholicStates: [], malolacticStates: [], parameterCodes: [],
}

/**
 * Administración › Analítica › Fases de elaboración. Each phase says when a content is in it (category and
 * fermentation states) and which parameters the report charts meanwhile. Order matters: first match wins.
 */
export function ReportPhasesTab({ canEdit }: { canEdit: boolean }) {
  const phases = useResource(() => reportsApi.phases(), [])
  const parameters = useResource(() => trackingApi.parameters(true), [])
  const categories = useResource(() => catalogApi.getInternalCategories(), [])
  const [editing, setEditing] = useState<ReportPhase | 'new'>()
  const [deleting, setDeleting] = useState<ReportPhase>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const list = phases.data ?? []
  const parameterName = useMemo(() => new Map((parameters.data ?? []).map((item) => [item.code, item.name])), [parameters.data])
  const categoryName = useMemo(() => new Map((categories.data ?? []).map((item) => [item.code, item.name])), [categories.data])

  const move = async (index: number, delta: number) => {
    const ids = list.map((phase) => phase.id)
    const target = index + delta
    if (target < 0 || target >= ids.length) return
    ;[ids[index], ids[target]] = [ids[target], ids[index]]
    setBusy(true)
    setError('')
    try {
      phases.setData(await reportsApi.reorderPhases(ids))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido cambiar el orden.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    setError('')
    try {
      await reportsApi.deletePhase(deleting.id)
      setDeleting(undefined)
      phases.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido eliminar la fase.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3">
      <div className={card}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <h2 className="text-sm font-semibold">Fases de elaboración</h2>
            <p className="mt-1 text-xs text-muted">
              Cada contenido está en una fase: el detalle del depósito la muestra y destaca sus parámetros, y el informe de estado de bodega agrupa los depósitos por fase. La fase se calcula con la
              categoría del contenido y sus estados de fermentación; se aplica la <strong>primera</strong> de la lista que encaja, así que el orden importa.
              Las fases pasadas se reconstruyen con las revisiones de estado (p. ej. un mosto que al terminar la alcohólica pasa a vino).
            </p>
          </div>
          {canEdit && (
            <button type="button" onClick={() => setEditing('new')} className="flex min-h-9 items-center gap-1 rounded-xl bg-plum px-3 text-xs font-semibold text-white">
              <Plus className="size-3.5" />Nueva fase
            </button>
          )}
        </div>
        {(error || phases.error) && <p role="alert" className="mt-3 rounded-xl bg-[#f7e0e6] p-2 text-xs text-[#8e1f33]">{error || phases.error}</p>}
      </div>

      {phases.loading && <p className="p-4 text-center text-xs text-muted">Cargando fases…</p>}
      {!phases.loading && list.length === 0 && <p className={`${card} text-center text-xs text-muted`}>No hay fases: todos los depósitos aparecerán como «Sin fase asignada».</p>}
      <ol className="space-y-2">
        {list.map((phase, index) => (
          <li key={phase.id} className={`${card} ${phase.active ? '' : 'opacity-60'}`}>
            <div className="flex flex-wrap items-start gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-plum-soft font-mono text-[11px] font-semibold text-plum">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="size-3 rounded-full" style={{ backgroundColor: phase.color }} aria-hidden="true" />
                  <strong className="text-sm">{phase.name}</strong>
                  <span className="font-mono text-[10.5px] text-muted">{phase.code}</span>
                  {!phase.active && <span className="rounded-full bg-field px-2 py-0.5 text-[10.5px] font-semibold text-muted">Inactiva</span>}
                </div>
                {phase.description && <p className="mt-0.5 text-xs text-muted">{phase.description}</p>}
                <dl className="mt-2 grid gap-1 text-[11.5px] sm:grid-cols-[110px_minmax(0,1fr)]">
                  <dt className="text-muted">Categoría</dt>
                  <dd>{phase.categoryCodes.length ? phase.categoryCodes.map((code) => categoryName.get(code) ?? code).join(', ') : 'Cualquiera'}</dd>
                  <dt className="text-muted">F. alcohólica</dt>
                  <dd>{phase.alcoholicStates.length ? phase.alcoholicStates.map(stateLabel).join(', ') : 'Cualquiera'}</dd>
                  <dt className="text-muted">F. maloláctica</dt>
                  <dd>{phase.malolacticStates.length ? phase.malolacticStates.map(stateLabel).join(', ') : 'Cualquiera'}</dd>
                  <dt className="text-muted">Se grafica</dt>
                  <dd className="flex flex-wrap gap-1">
                    {phase.parameterCodes.map((code) => (
                      <span key={code} className="rounded-full bg-plum-soft px-2 py-0.5 text-[10.5px] font-semibold text-plum">{parameterName.get(code) ?? code}</span>
                    ))}
                  </dd>
                </dl>
              </div>
              {canEdit && (
                <div className="flex items-center gap-1">
                  <button type="button" disabled={busy || index === 0} onClick={() => void move(index, -1)} aria-label={`Subir ${phase.name}`} className="rounded-lg border border-border p-1.5 disabled:opacity-40"><ArrowUp className="size-3.5" /></button>
                  <button type="button" disabled={busy || index === list.length - 1} onClick={() => void move(index, 1)} aria-label={`Bajar ${phase.name}`} className="rounded-lg border border-border p-1.5 disabled:opacity-40"><ArrowDown className="size-3.5" /></button>
                  <button type="button" onClick={() => setEditing(phase)} className="ml-2 text-xs font-semibold text-plum">Editar</button>
                  <button type="button" onClick={() => setDeleting(phase)} className="ml-2 text-xs font-semibold text-[#8e1f33]">Eliminar</button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      {editing && (
        <PhaseForm
          phase={editing === 'new' ? undefined : editing}
          parameters={(parameters.data ?? []).map((item) => ({ code: item.code, name: item.name, unit: item.unit }))}
          categories={(categories.data ?? []).filter((item) => item.active).map((item) => ({ code: item.code, name: item.name }))}
          onClose={() => setEditing(undefined)}
          onSaved={() => { setEditing(undefined); phases.reload() }}
        />
      )}
      <CenteredModal open={!!deleting} title="Eliminar fase" size="sm" primaryLabel={busy ? 'Eliminando…' : 'Eliminar'} primaryKind="danger"
        primaryDisabled={busy} onPrimary={() => void remove()} onClose={() => setDeleting(undefined)}>
        <p className="text-xs text-copy">
          Se eliminará la fase <strong>{deleting?.name}</strong>. Los informes ya emitidos no cambian; en los nuevos, sus depósitos pasarán a la siguiente fase que encaje.
        </p>
      </CenteredModal>
    </section>
  )
}

interface PhaseFormProps {
  phase?: ReportPhase
  parameters: Array<{ code: string; name: string; unit: string | null }>
  categories: Array<{ code: string; name: string }>
  onClose: () => void
  onSaved: () => void
}

function PhaseForm({ phase, parameters, categories, onClose, onSaved }: PhaseFormProps) {
  const [form, setForm] = useState<ReportPhaseInput>(() => (phase ? {
    code: phase.code, name: phase.name, description: phase.description, color: phase.color, active: phase.active,
    categoryCodes: phase.categoryCodes, alcoholicStates: phase.alcoholicStates, malolacticStates: phase.malolacticStates,
    parameterCodes: phase.parameterCodes,
  } : EMPTY))
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const names = useMemo(() => new Map(parameters.map((item) => [item.code, item])), [parameters])
  const preSelected = useMemo(() => new Set(form.parameterCodes), [form.parameterCodes])

  useEffect(() => { setError('') }, [form])

  const toggle = (key: 'categoryCodes' | 'alcoholicStates' | 'malolacticStates', value: string) => {
    const current = form[key]
    setForm({ ...form, [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value] })
  }
  const moveParameter = (index: number, delta: number) => {
    const next = [...form.parameterCodes]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setForm({ ...form, parameterCodes: next })
  }

  const save = async () => {
    if (!form.name.trim()) { setError('Indica un nombre.'); return }
    if (form.parameterCodes.length === 0) { setError('Elige al menos un parámetro para graficar.'); return }
    setSaving(true)
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description?.trim() || null }
      if (phase) await reportsApi.updatePhase(phase.id, payload)
      else await reportsApi.createPhase(payload)
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar la fase.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <CenteredModal open={!picking} title={phase ? `Editar fase · ${phase.name}` : 'Nueva fase de informe'} size="lg"
        primaryLabel={saving ? 'Guardando…' : 'Guardar'} primaryDisabled={saving} onPrimary={() => void save()} onClose={onClose}
        subtitle="Vacío = cualquiera. «Sin estado» encaja con contenidos sin ese estado registrado.">
        <div className="space-y-4 text-xs">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_90px]">
            <label className="font-semibold text-copy">Nombre
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} maxLength={120} className={`mt-1 ${input}`} />
            </label>
            <label className="font-semibold text-copy">Código
              <input value={form.code ?? ''} onChange={(event) => setForm({ ...form, code: event.target.value })} maxLength={40}
                placeholder="Automático" className={`mt-1 font-mono uppercase ${input}`} />
            </label>
            <label className="font-semibold text-copy">Color
              <input type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} className="mt-1 h-[34px] w-full cursor-pointer rounded-xl border border-border bg-white p-1" />
            </label>
          </div>
          <label className="block font-semibold text-copy">Descripción
            <input value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} maxLength={500} className={`mt-1 ${input}`} />
          </label>
          <label className="flex items-center gap-2 text-copy">
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="accent-[#6d4656]" />
            Activa (las inactivas no se tienen en cuenta)
          </label>

          <Checks title="Categoría del contenido" values={categories.map((item) => ({ value: item.code, label: item.name }))}
            selected={form.categoryCodes} onToggle={(value) => toggle('categoryCodes', value)} />
          <Checks title="Fermentación alcohólica" values={ALCOHOLIC_STATES.map((value) => ({ value, label: stateLabel(value) }))}
            selected={form.alcoholicStates} onToggle={(value) => toggle('alcoholicStates', value)} />
          <Checks title="Fermentación maloláctica" values={MALOLACTIC_STATES.map((value) => ({ value, label: stateLabel(value) }))}
            selected={form.malolacticStates} onToggle={(value) => toggle('malolacticStates', value)} />

          <div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-copy">Parámetros que se grafican <span className="font-normal text-muted">(en este orden)</span></span>
              <button type="button" onClick={() => setPicking(true)} className="flex items-center gap-1 font-semibold text-plum"><Plus className="size-3.5" />Elegir</button>
            </div>
            {form.parameterCodes.length === 0 && <p className="mt-2 rounded-xl bg-field p-3 text-muted">Ninguno todavía.</p>}
            <ol className="mt-2 space-y-1">
              {form.parameterCodes.map((code, index) => (
                <li key={code} className="flex items-center gap-2 rounded-xl border border-border px-2 py-1.5">
                  <span className="w-5 text-center font-mono text-[10.5px] text-muted">{index + 1}</span>
                  <span className="flex-1">{names.get(code)?.name ?? code} <span className="text-muted">{names.get(code)?.unit ?? ''}</span></span>
                  <button type="button" onClick={() => moveParameter(index, -1)} disabled={index === 0} aria-label="Subir" className="p-1 disabled:opacity-30"><ArrowUp className="size-3.5" /></button>
                  <button type="button" onClick={() => moveParameter(index, 1)} disabled={index === form.parameterCodes.length - 1} aria-label="Bajar" className="p-1 disabled:opacity-30"><ArrowDown className="size-3.5" /></button>
                  <button type="button" onClick={() => setForm({ ...form, parameterCodes: form.parameterCodes.filter((item) => item !== code) })} aria-label={`Quitar ${code}`} className="p-1 text-[#8e1f33]"><X className="size-3.5" /></button>
                </li>
              ))}
            </ol>
          </div>
          {error && <p role="alert" className="rounded-xl bg-[#f7e0e6] p-2 text-[#8e1f33]">{error}</p>}
        </div>
      </CenteredModal>
      <ParameterPickerModal open={picking} title="Parámetros de la fase" parameters={parameters} preSelected={preSelected}
        onClose={() => setPicking(false)}
        onPick={(codes) => {
          const picked = Array.isArray(codes) ? codes : codes ? [codes] : []
          // Keep the chosen order of the ones already there, append the new ones.
          const kept = form.parameterCodes.filter((code) => picked.includes(code))
          setForm({ ...form, parameterCodes: [...kept, ...picked.filter((code) => !kept.includes(code))] })
          setPicking(false)
        }} />
    </>
  )
}

function Checks({ title, values, selected, onToggle }: { title: string; values: Array<{ value: string; label: string }>; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <fieldset>
      <legend className="font-semibold text-copy">{title} <span className="font-normal text-muted">· {selected.length ? `${selected.length} elegidos` : 'cualquiera'}</span></legend>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {values.map((item) => {
          const on = selected.includes(item.value)
          return (
            <button key={item.value} type="button" onClick={() => onToggle(item.value)} aria-pressed={on}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${on ? 'border-plum bg-plum text-white' : 'border-border bg-white text-copy hover:bg-plum-soft'}`}>
              {item.label}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
