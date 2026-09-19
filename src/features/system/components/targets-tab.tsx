import { useState } from 'react'
import { useResource } from '../../../hooks/use-resource'
import { fermentationLabels } from '../../../lib/labels'
import { formatNumber } from '../../../lib/format'
import { catalogApi } from '../../../services/catalog-api'
import { trackingApi, type TargetInput, type TargetView } from '../../tracking/services/tracking-api'

const card = 'rounded-2xl border border-border bg-white p-4'
const input = 'rounded-xl border border-border bg-white px-2 py-1.5 text-xs'
const LIMITS = ['warnMin', 'warnMax', 'critMin', 'critMax'] as const
type Limit = (typeof LIMITS)[number]
const LIMIT_LABEL: Record<Limit, string> = { warnMin: 'Aviso mín.', warnMax: 'Aviso máx.', critMin: 'Crítico mín.', critMax: 'Crítico máx.' }

interface Draft { id?: string; parameter: string; categoryCode: string; phase: string; note: string; limits: Record<Limit, string> }
const blank = (): Draft => ({ parameter: '', categoryCode: '', phase: '', note: '', limits: { warnMin: '', warnMax: '', critMin: '', critMax: '' } })

/** "0,6" or "0.6" → 0.6; empty → null; anything else → NaN. */
function parseLimit(text: string): number | null {
  const clean = text.trim().replace(',', '.')
  if (!clean) return null
  return /^-?\d+(\.\d+)?$/.test(clean) ? Number(clean) : Number.NaN
}

/** Warning / critical ranges that colour the tracking matrix and draw the bands on the curves. */
export function TargetsTab() {
  const targets = useResource(() => trackingApi.listTargets(), [])
  const parameters = useResource(() => trackingApi.parameters(true), [])
  const categories = useResource(() => catalogApi.getInternalCategories(), [])
  const [draft, setDraft] = useState<Draft>(blank())
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const edit = (target: TargetView) => setDraft({
    id: target.id, parameter: target.parameter, categoryCode: target.categoryCode ?? '', phase: target.phase ?? '', note: target.note ?? '',
    limits: { warnMin: fmt(target.warnMin), warnMax: fmt(target.warnMax), critMin: fmt(target.critMin), critMax: fmt(target.critMax) },
  })

  const save = async () => {
    setError('')
    if (!draft.parameter) { setError('Elige un parámetro.'); return }
    const parsed = Object.fromEntries(LIMITS.map((key) => [key, parseLimit(draft.limits[key])])) as Record<Limit, number | null>
    if (LIMITS.some((key) => Number.isNaN(parsed[key]))) { setError('Los límites deben ser números (admite coma decimal).'); return }
    const body: TargetInput = { parameter: draft.parameter, categoryCode: draft.categoryCode || null, phase: draft.phase || null, note: draft.note.trim() || null, ...parsed }
    setBusy(true)
    try {
      if (draft.id) await trackingApi.updateTarget(draft.id, body)
      else await trackingApi.createTarget(body)
      setDraft(blank())
      targets.reload()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar el objetivo.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (target: TargetView) => {
    if (!confirm(`¿Eliminar el objetivo de ${target.parameterName}?`)) return
    setError('')
    try { await trackingApi.deleteTarget(target.id); if (draft.id === target.id) setDraft(blank()); targets.reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido eliminar el objetivo.') }
  }

  return (
    <section className={`mt-4 ${card}`}>
      <h2 className="text-sm font-semibold">Objetivos analíticos</h2>
      <p className="mt-1 text-xs text-muted">Un valor fuera de «aviso» sale en ámbar y fuera de «crítico» en rojo en Seguimiento. Aplica el objetivo más específico: categoría y fase, luego categoría, luego fase y, por último, el general.</p>

      <div className="mt-4 grid gap-2 md:grid-cols-3">
        <label className="grid gap-1 text-[11px] font-semibold text-muted">Parámetro
          <select value={draft.parameter} onChange={(event) => setDraft({ ...draft, parameter: event.target.value })} className={`${input} font-normal text-copy`}>
            <option value="">Elegir…</option>{(parameters.data ?? []).map((parameter) => <option key={parameter.code} value={parameter.code}>{parameter.name}{parameter.unit ? ` (${parameter.unit})` : ''}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[11px] font-semibold text-muted">Categoría
          <select value={draft.categoryCode} onChange={(event) => setDraft({ ...draft, categoryCode: event.target.value })} className={`${input} font-normal text-copy`}>
            <option value="">Todas</option>{(categories.data ?? []).map((category) => <option key={category.code} value={category.code}>{category.name}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-[11px] font-semibold text-muted">Fase de la fermentación alcohólica
          <select value={draft.phase} onChange={(event) => setDraft({ ...draft, phase: event.target.value })} className={`${input} font-normal text-copy`}>
            <option value="">Cualquiera</option>{Object.entries(fermentationLabels).map(([code, label]) => <option key={code} value={code}>{label}</option>)}
          </select>
        </label>
        {LIMITS.map((key) => (
          <label key={key} className="grid gap-1 text-[11px] font-semibold text-muted">{LIMIT_LABEL[key]}
            <input inputMode="decimal" value={draft.limits[key]} onChange={(event) => setDraft({ ...draft, limits: { ...draft.limits, [key]: event.target.value } })} placeholder="sin límite" className={`${input} font-normal text-copy`} />
          </label>
        ))}
        <label className="grid gap-1 text-[11px] font-semibold text-muted">Nota
          <input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} className={`${input} font-normal text-copy`} />
        </label>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#f7e0e6] p-2 text-xs text-[#8e1f33]">{error}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={busy} onClick={save} className="rounded-xl bg-plum px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{draft.id ? 'Guardar cambios' : 'Añadir objetivo'}</button>
        {draft.id && <button type="button" onClick={() => { setDraft(blank()); setError('') }} className="rounded-xl border border-border px-4 py-2 text-xs font-semibold">Cancelar</button>}
      </div>

      <div className="mt-4 overflow-x-auto">
        {targets.error && <p role="alert" className="text-xs text-[#8e1f33]">{targets.error}</p>}
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead><tr className="border-y border-border bg-[#fbf7f9] text-left text-[11px] text-muted">
            <th className="px-3 py-2">Parámetro</th><th className="px-3 py-2">Categoría</th><th className="px-3 py-2">Fase</th>
            {LIMITS.map((key) => <th key={key} className="px-3 py-2">{LIMIT_LABEL[key]}</th>)}<th className="px-3 py-2" />
          </tr></thead>
          <tbody>
            {(targets.data ?? []).map((target) => (
              <tr key={target.id} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-semibold">{target.parameterName}<span className="ml-1 font-normal text-muted">{target.unit}</span>{target.note && <div className="font-normal text-muted">{target.note}</div>}</td>
                <td className="px-3 py-2">{target.categoryName ?? 'Todas'}</td>
                <td className="px-3 py-2">{target.phase ? fermentationLabels[target.phase] ?? target.phase : 'Cualquiera'}</td>
                {LIMITS.map((key) => <td key={key} className="px-3 py-2 font-mono">{target[key] === null ? '—' : formatNumber(target[key], 2)}</td>)}
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button type="button" onClick={() => edit(target)} className="mr-3 text-plum">Editar</button>
                  <button type="button" onClick={() => remove(target)} className="text-[#8e1f33]">Eliminar</button>
                </td>
              </tr>
            ))}
            {targets.data?.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-muted">Aún no hay objetivos.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

const fmt = (value: number | null) => (value === null ? '' : String(value).replace('.', ','))
