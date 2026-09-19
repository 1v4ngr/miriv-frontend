import { useState } from 'react'
import { BellRing, Pin } from 'lucide-react'
import { useCan } from '../../../hooks/use-permissions'
import { useResource } from '../../../hooks/use-resource'
import { formatNumber } from '../../../lib/format'
import { AlertRuleForm, describeRule } from './alert-rule-form'
import { trackingApi, type AlertRule, type AlertRuleInput, type TargetInput } from '../services/tracking-api'

const input = 'rounded-lg border border-border bg-white px-2 py-1.5 text-xs'
const LIMITS = ['warnMin', 'warnMax', 'critMin', 'critMax'] as const
type Limit = (typeof LIMITS)[number]
const LABEL: Record<Limit, string> = { warnMin: 'Aviso mín.', warnMax: 'Aviso máx.', critMin: 'Crítico mín.', critMax: 'Crítico máx.' }
const parse = (text: string): number | null => {
  const value = text.trim().replace(',', '.')
  return value === '' || Number.isNaN(Number(value)) ? null : Number(value)
}
const show = (value: number | null) => (value === null ? '' : String(value).replace('.', ','))

/** Values fixed for this one wine (they beat the category / global ranges) and alert rules that only watch it. */
export function ContentWatchPanel({ code }: { code: string }) {
  const canEdit = useCan('RULE_EDIT')
  const targets = useResource(() => trackingApi.contentTargets(code), [code])
  const rules = useResource(() => trackingApi.contentAlertRules(code), [code])
  const parameters = useResource(() => trackingApi.parameters(true), [])
  const [draft, setDraft] = useState<{ parameter: string; note: string; limits: Record<Limit, string> }>()
  const [editing, setEditing] = useState<AlertRule | 'new'>()
  const [error, setError] = useState('')

  const saveTarget = async () => {
    if (!draft?.parameter) { setError('Elige un parámetro.'); return }
    const limits = Object.fromEntries(LIMITS.map((key) => [key, parse(draft.limits[key])])) as Record<Limit, number | null>
    if (LIMITS.every((key) => limits[key] === null)) { setError('Define al menos un límite.'); return }
    const body: TargetInput = { parameter: draft.parameter, categoryCode: null, phase: null, note: draft.note.trim() || null, ...limits }
    setError('')
    try { await trackingApi.saveContentTarget(code, body); setDraft(undefined); targets.reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido guardar.') }
  }
  const run = async (action: () => Promise<unknown>, reload: () => void) => {
    setError('')
    try { await action(); reload() } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido completar la acción.') }
  }
  const saveRule = async (rule: AlertRuleInput) => {
    if (editing && editing !== 'new') await trackingApi.updateAlertRule(editing.id, rule)
    else await trackingApi.createAlertRule(rule)
    setEditing(undefined)
    rules.reload()
  }
  const nameOf = (parameterCode: string) => (parameters.data ?? []).find((item) => item.code === parameterCode)?.name ?? parameterCode

  return (
    <div className="mt-4 space-y-4">
      {error && <p role="alert" className="rounded-xl bg-[#f7e0e6] p-2 text-xs text-[#8e1f33]">{error}</p>}

      <section className="rounded-2xl border border-border bg-white p-4" aria-label="Valores fijados">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><Pin className="size-4 text-plum" aria-hidden="true" />Valores fijados para {code}</h3>
        <p className="mt-1 text-[11.5px] text-muted">Rangos de aviso y crítico solo para este contenido: mandan sobre los de su categoría y los generales, y son los que colorean sus gráficos y estado.</p>
        <ul className="mt-3 space-y-1.5">
          {(targets.data ?? []).length === 0 && <li className="text-xs text-muted">Sin valores fijados: se usan los generales.</li>}
          {(targets.data ?? []).map((target) => (
            <li key={target.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border px-3 py-2 text-xs">
              <strong className="min-w-[110px]">{target.parameterName}</strong>
              <span className="font-mono text-muted">{LIMITS.filter((key) => target[key] !== null).map((key) => `${LABEL[key]} ${formatNumber(target[key], 2)}`).join(' · ')}</span>
              {target.note && <span className="text-muted">{target.note}</span>}
              {canEdit && (
                <span className="ml-auto flex gap-3">
                  <button type="button" className="font-semibold text-plum" onClick={() => setDraft({ parameter: target.parameter, note: target.note ?? '', limits: { warnMin: show(target.warnMin), warnMax: show(target.warnMax), critMin: show(target.critMin), critMax: show(target.critMax) } })}>Editar</button>
                  <button type="button" className="font-semibold text-[#8e1f33]" onClick={() => void run(() => trackingApi.deleteContentTarget(code, target.id), targets.reload)}>Quitar</button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {canEdit && !draft && <button type="button" onClick={() => setDraft({ parameter: '', note: '', limits: { warnMin: '', warnMax: '', critMin: '', critMax: '' } })} className="mt-3 text-xs font-semibold text-plum">+ Fijar valores de un parámetro</button>}
        {canEdit && draft && (
          <div className="mt-3 grid gap-2 rounded-xl border border-border bg-[#fbf7f9] p-3 text-xs md:grid-cols-3">
            <label className="grid gap-1 font-semibold text-muted">Parámetro
              <select value={draft.parameter} onChange={(event) => setDraft({ ...draft, parameter: event.target.value })} className={input}><option value="">Elegir…</option>{(parameters.data ?? []).map((item) => <option key={item.code} value={item.code}>{item.name}{item.unit ? ` (${item.unit})` : ''}</option>)}</select>
            </label>
            {LIMITS.map((key) => (
              <label key={key} className="grid gap-1 font-semibold text-muted">{LABEL[key]}
                <input defaultValue={draft.limits[key]} onBlur={(event) => setDraft({ ...draft, limits: { ...draft.limits, [key]: event.target.value } })} placeholder="sin límite" className={input} inputMode="decimal" />
              </label>
            ))}
            <label className="grid gap-1 font-semibold text-muted">Nota<input value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} className={input} /></label>
            <div className="flex items-end gap-2 md:col-span-3">
              <button type="button" onClick={saveTarget} className="rounded-xl bg-plum px-4 py-1.5 font-semibold text-white">Guardar</button>
              <button type="button" onClick={() => setDraft(undefined)} className="rounded-xl border border-border bg-white px-4 py-1.5 font-semibold">Cancelar</button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-white p-4" aria-label="Avisos del contenido">
        <h3 className="flex items-center gap-2 text-sm font-semibold"><BellRing className="size-4 text-plum" aria-hidden="true" />Avisos solo para {code}</h3>
        <p className="mt-1 text-[11.5px] text-muted">Reglas que vigilan únicamente este contenido y aparecen en el panel «Avisos» del dashboard.</p>
        <ul className="mt-3 space-y-1.5">
          {(rules.data ?? []).length === 0 && <li className="text-xs text-muted">Sin avisos propios.</li>}
          {(rules.data ?? []).map((rule) => (
            <li key={rule.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-border px-3 py-2 text-xs">
              <strong>{rule.name}</strong>
              <span className="text-muted">{describeRule(rule, parameters.data ?? []) || rule.conditions.map((c) => nameOf(c.parameter)).join(', ')}</span>
              {!rule.active && <span className="rounded-full bg-[#eee9f4] px-2 py-0.5 text-[10px] font-semibold text-[#5b4a72]">Desactivado</span>}
              {canEdit && (
                <span className="ml-auto flex gap-3">
                  <button type="button" className="font-semibold text-plum" onClick={() => setEditing(rule)}>Editar</button>
                  <button type="button" className="font-semibold text-[#8e1f33]" onClick={() => { if (confirm(`¿Eliminar el aviso «${rule.name}»?`)) void run(() => trackingApi.deleteAlertRule(rule.id), rules.reload) }}>Eliminar</button>
                </span>
              )}
            </li>
          ))}
        </ul>
        {canEdit && !editing && <button type="button" onClick={() => setEditing('new')} className="mt-3 text-xs font-semibold text-plum">+ Nuevo aviso para este contenido</button>}
        {canEdit && editing && (
          <div className="mt-3">
            <AlertRuleForm key={editing === 'new' ? 'new' : editing.id} parameters={parameters.data ?? []} categories={[]} contentCode={code} initial={editing === 'new' ? undefined : editing} onSave={saveRule} onCancel={() => setEditing(undefined)} />
          </div>
        )}
      </section>
    </div>
  )
}
