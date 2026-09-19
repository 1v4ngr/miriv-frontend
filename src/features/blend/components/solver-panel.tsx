import { useMemo, useState } from 'react'
import { formatLiters, formatNumber } from '../../../lib/format'
import { ruleOf } from '../rules'
import { solveBlend, type Goal, type SolveOutput, type Target } from '../solver'
import type { ParameterMeta, WineComponent } from '../types'

export interface SolverSettings { targets: Target[]; goal: Goal; totalMin: number | null; totalMax: number | null }

interface Props {
  components: WineComponent[]
  catalog: ParameterMeta[]
  settings: SolverSettings
  onChange: (settings: SolverSettings) => void
  onApply: (volumes: Record<string, number>) => void
  locked: boolean
}

const input = 'rounded-lg border border-border bg-white px-2 py-1 text-xs'
const parse = (text: string): number | null => {
  const value = text.trim().replace(',', '.')
  return value === '' || Number.isNaN(Number(value)) ? null : Number(value)
}

/** "Which litres of each tank meet these targets?" — linear parameters only; pH is checked afterwards in the table. */
export function SolverPanel({ components, catalog, settings, onChange, onApply, locked }: Props) {
  const [output, setOutput] = useState<SolveOutput>()
  const options = useMemo(() => {
    const present = new Set(components.flatMap((component) => Object.keys(component.readings)))
    return catalog.filter((parameter) => present.has(parameter.code) && ['LINEAR', 'LINEAR_APPROX', 'UPPER_BOUND'].includes(ruleOf(parameter.code)))
  }, [components, catalog])
  const patchTarget = (index: number, patch: Partial<Target>) => onChange({ ...settings, targets: settings.targets.map((target, i) => (i === index ? { ...target, ...patch } : target)) })
  const goalKind = settings.goal.kind
  const goalComponent = settings.goal.kind === 'MAX_VOLUME' ? components[0]?.id ?? '' : settings.goal.componentId

  const run = () => setOutput(solveBlend({ components, targets: settings.targets, totalMin: settings.totalMin, totalMax: settings.totalMax, goal: settings.goal, parameters: catalog }))

  return (
    <div className="space-y-3 text-xs">
      <div className="space-y-1.5">
        {settings.targets.map((target, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <select value={target.parameter} onChange={(event) => patchTarget(index, { parameter: event.target.value })} className={`${input} min-w-[140px] flex-1`} aria-label="Parámetro objetivo">
              {options.map((parameter) => <option key={parameter.code} value={parameter.code}>{parameter.name}{parameter.unit ? ` (${parameter.unit})` : ''}</option>)}
            </select>
            <label className="flex items-center gap-1 text-muted">mín<input defaultValue={target.min ?? ''} onBlur={(event) => patchTarget(index, { min: parse(event.target.value) })} className={`${input} w-16 text-right`} inputMode="decimal" /></label>
            <label className="flex items-center gap-1 text-muted">máx<input defaultValue={target.max ?? ''} onBlur={(event) => patchTarget(index, { max: parse(event.target.value) })} className={`${input} w-16 text-right`} inputMode="decimal" /></label>
            <button type="button" onClick={() => onChange({ ...settings, targets: settings.targets.filter((_, i) => i !== index) })} className="text-muted hover:text-[#8e1f33]" aria-label="Quitar objetivo">✕</button>
          </div>
        ))}
        <button type="button" disabled={locked || options.length === 0} onClick={() => onChange({ ...settings, targets: [...settings.targets, { parameter: options[0].code, min: null, max: null }] })} className="font-semibold text-plum disabled:opacity-40">+ Añadir objetivo</button>
      </div>

      <fieldset className="space-y-1.5 rounded-xl border border-border p-2">
        <legend className="px-1 font-semibold text-muted">Meta</legend>
        <label className="flex items-center gap-2"><input type="radio" checked={goalKind === 'MAX_VOLUME'} onChange={() => onChange({ ...settings, goal: { kind: 'MAX_VOLUME' } })} />Máximo volumen posible</label>
        <label className="flex flex-wrap items-center gap-2"><input type="radio" checked={goalKind === 'MAX_COMPONENT'} onChange={() => onChange({ ...settings, goal: { kind: 'MAX_COMPONENT', componentId: goalComponent } })} />Dar salida a
          <select value={goalComponent} onChange={(event) => onChange({ ...settings, goal: { kind: goalKind === 'MIN_COMPONENT' ? 'MIN_COMPONENT' : 'MAX_COMPONENT', componentId: event.target.value } })} className={input}>{components.map((component) => <option key={component.id} value={component.id}>{component.label}</option>)}</select>
        </label>
        <label className="flex items-center gap-2"><input type="radio" checked={goalKind === 'MIN_COMPONENT'} onChange={() => onChange({ ...settings, goal: { kind: 'MIN_COMPONENT', componentId: goalComponent } })} />Usar lo mínimo del depósito elegido (requiere volumen mínimo)</label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-1 text-muted">Volumen total mín. (L)<input defaultValue={settings.totalMin ?? ''} key={`min-${settings.totalMin}`} onBlur={(event) => onChange({ ...settings, totalMin: parse(event.target.value) })} className={`${input} w-20 text-right`} inputMode="numeric" /></label>
        <label className="flex items-center gap-1 text-muted">máx. (L)<input defaultValue={settings.totalMax ?? ''} key={`max-${settings.totalMax}`} onBlur={(event) => onChange({ ...settings, totalMax: parse(event.target.value) })} className={`${input} w-20 text-right`} inputMode="numeric" /></label>
        <button type="button" onClick={run} className="ml-auto rounded-xl bg-plum px-4 py-1.5 font-semibold text-white">Buscar</button>
      </div>

      {output && !output.ok && <p role="alert" className="rounded-xl bg-[#f5eed0] p-2 text-[#6b5a10]">{output.reason}</p>}
      {output?.ok && (
        <div className="space-y-2 rounded-xl border border-border p-2">
          <table className="w-full"><tbody>
            {components.map((component) => (
              <tr key={component.id}><td className="py-0.5">{component.label}</td><td className="text-right font-mono font-semibold">{formatLiters(output.rounded[component.id] ?? 0)} L</td></tr>
            ))}
            <tr className="border-t border-border"><td className="py-0.5 font-semibold">Total</td><td className="text-right font-mono font-semibold">{formatNumber(Object.values(output.rounded).reduce((sum, value) => sum + value, 0), 0)} L</td></tr>
          </tbody></table>
          {output.warnings.map((warning) => <p key={warning} className="text-[11px] text-muted">{warning}</p>)}
          <button type="button" disabled={locked} onClick={() => onApply(output.rounded)} className="rounded-xl border border-plum px-3 py-1.5 font-semibold text-plum hover:bg-plum-soft disabled:opacity-40">Aplicar estas cantidades</button>
        </div>
      )}
    </div>
  )
}
