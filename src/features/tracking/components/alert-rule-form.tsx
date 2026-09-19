import { useState } from 'react'
import { fermentationLabels } from '../../../lib/labels'
import type { AlertCondition, AlertRule, AlertRuleInput, AlertSeverity, ParameterInfo } from '../services/tracking-api'

const input = 'rounded-lg border border-border bg-white px-2 py-1.5 text-xs'
const SEVERITY_LABEL: Record<AlertSeverity, string> = { INFO: 'Informativo', WARN: 'Aviso', CRIT: 'Crítico' }
const TYPE_LABEL: Record<AlertCondition['type'], string> = { LTE: 'es menor o igual que', GTE: 'es mayor o igual que', STABLE: 'está estable' }

/** "0,998" or "0.998" → 0.998; empty → null. */
const parse = (text: string): number | null => {
  const value = text.trim().replace(',', '.')
  return value === '' || Number.isNaN(Number(value)) ? null : Number(value)
}
const show = (value: number | null) => (value === null ? '' : String(value).replace('.', ','))
const blank = (parameter: string): AlertCondition => ({ parameter, type: 'LTE', value: null, days: null, tolerance: null })

interface Props {
  parameters: ParameterInfo[]
  categories: Array<{ code: string; name: string }>
  /** Set when the rule is fixed for one content: the category picker is hidden. */
  contentCode?: string
  initial?: AlertRule
  onSave: (rule: AlertRuleInput) => Promise<void>
  onCancel: () => void
}

/** Name, severity, conditions (all must hold), category and the fermentation phases the rule applies to. */
export function AlertRuleForm({ parameters, categories, contentCode, initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [severity, setSeverity] = useState<AlertSeverity>(initial?.severity ?? 'INFO')
  const [conditions, setConditions] = useState<AlertCondition[]>(initial?.conditions ?? [blank(parameters.find((item) => item.code === 'DENSITY')?.code ?? parameters[0]?.code ?? '')])
  const [category, setCategory] = useState(initial?.categoryCode ?? '')
  const [phases, setPhases] = useState<string[]>(initial?.phases ?? [])
  const [active, setActive] = useState(initial?.active ?? true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const patch = (index: number, change: Partial<AlertCondition>) => setConditions((list) => list.map((item, i) => (i === index ? { ...item, ...change } : item)))

  const submit = async () => {
    setError('')
    if (!name.trim()) { setError('Pon un nombre al aviso.'); return }
    for (const condition of conditions) {
      if (condition.type !== 'STABLE' && condition.value === null) { setError('Cada condición necesita un valor.'); return }
      if (condition.type === 'STABLE' && (!condition.days || condition.tolerance === null)) { setError('«Está estable» necesita los días y la tolerancia.'); return }
    }
    setBusy(true)
    try {
      await onSave({ name: name.trim(), severity, conditions, categoryCode: contentCode ? null : category || null, contentCode: contentCode ?? initial?.contentCode ?? null, phases, active })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar el aviso.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-[#fbf7f9] p-3 text-xs">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="grid gap-1 font-semibold text-muted">Nombre<input value={name} onChange={(event) => setName(event.target.value)} className={input} placeholder="Ej. Fermentación terminada" /></label>
        <label className="grid gap-1 font-semibold text-muted">Gravedad
          <select value={severity} onChange={(event) => setSeverity(event.target.value as AlertSeverity)} className={input}>{(Object.keys(SEVERITY_LABEL) as AlertSeverity[]).map((key) => <option key={key} value={key}>{SEVERITY_LABEL[key]}</option>)}</select>
        </label>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold text-muted">Se avisa cuando se cumplan todas estas condiciones</legend>
        {conditions.map((condition, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <select value={condition.parameter} onChange={(event) => patch(index, { parameter: event.target.value })} className={input} aria-label="Parámetro">{parameters.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select>
            <select value={condition.type} onChange={(event) => patch(index, { type: event.target.value as AlertCondition['type'] })} className={input} aria-label="Condición">{(Object.keys(TYPE_LABEL) as Array<AlertCondition['type']>).map((key) => <option key={key} value={key}>{TYPE_LABEL[key]}</option>)}</select>
            {condition.type === 'STABLE' ? (
              <>
                <label className="flex items-center gap-1 text-muted">durante<input defaultValue={condition.days ?? ''} onBlur={(event) => patch(index, { days: parse(event.target.value) })} className={`${input} w-14 text-right`} inputMode="numeric" />días</label>
                <label className="flex items-center gap-1 text-muted">variando como mucho<input defaultValue={show(condition.tolerance)} onBlur={(event) => patch(index, { tolerance: parse(event.target.value) })} className={`${input} w-20 text-right`} inputMode="decimal" /></label>
              </>
            ) : <input defaultValue={show(condition.value)} onBlur={(event) => patch(index, { value: parse(event.target.value) })} className={`${input} w-24 text-right`} inputMode="decimal" aria-label="Valor" placeholder="valor" />}
            {conditions.length > 1 && <button type="button" aria-label="Quitar condición" onClick={() => setConditions((list) => list.filter((_, i) => i !== index))} className="text-muted hover:text-[#8e1f33]">✕</button>}
          </div>
        ))}
        {conditions.length < 4 && <button type="button" onClick={() => setConditions((list) => [...list, blank(parameters[0]?.code ?? '')])} className="font-semibold text-plum">+ Añadir condición</button>}
      </fieldset>

      {!contentCode && (
        <label className="grid gap-1 font-semibold text-muted">Categoría
          <select value={category} onChange={(event) => setCategory(event.target.value)} className={input}><option value="">Todas</option>{categories.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}</select>
        </label>
      )}
      <fieldset>
        <legend className="mb-1 font-semibold text-muted">Solo cuando la fermentación alcohólica esté (ninguna marcada = siempre)</legend>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(fermentationLabels).map(([code, label]) => (
            <label key={code} className={`cursor-pointer rounded-full border px-2.5 py-1 font-semibold ${phases.includes(code) ? 'border-plum bg-plum text-white' : 'border-border bg-white text-copy'}`}>
              <input type="checkbox" className="sr-only" checked={phases.includes(code)} onChange={(event) => setPhases((list) => (event.target.checked ? [...list, code] : list.filter((item) => item !== code)))} />{label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="flex items-center gap-2"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="size-3.5 accent-plum" />Aviso activo</label>
      {error && <p role="alert" className="rounded-lg bg-[#f7e0e6] p-2 text-[#8e1f33]">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={submit} className="rounded-xl bg-plum px-4 py-1.5 font-semibold text-white disabled:opacity-50">{initial ? 'Guardar cambios' : 'Crear aviso'}</button>
        <button type="button" onClick={onCancel} className="rounded-xl border border-border bg-white px-4 py-1.5 font-semibold">Cancelar</button>
      </div>
    </div>
  )
}

/** One-line summary of a rule: "Densidad ≤ 0,998 · Densidad estable 2 d (±0,0015)". */
export function describeRule(rule: AlertRule, parameters: ParameterInfo[]): string {
  const name = (code: string) => parameters.find((item) => item.code === code)?.name ?? code
  return rule.conditions.map((condition) => {
    if (condition.type === 'STABLE') return `${name(condition.parameter)} estable ${condition.days} d (±${show(condition.tolerance)})`
    return `${name(condition.parameter)} ${condition.type === 'LTE' ? '≤' : '≥'} ${show(condition.value)}`
  }).join(' y ')
}
