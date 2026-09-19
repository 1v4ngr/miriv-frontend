import { useState } from 'react'
import { useResource } from '../../../hooks/use-resource'
import { fermentationLabels } from '../../../lib/labels'
import { catalogApi } from '../../../services/catalog-api'
import { AlertRuleForm, describeRule } from '../../tracking/components/alert-rule-form'
import { trackingApi, type AlertRule, type AlertRuleInput } from '../../tracking/services/tracking-api'

const card = 'rounded-2xl border border-border bg-white p-4'
const SEVERITY: Record<string, string> = { INFO: 'bg-[#e0ecf5] text-[#1f4f73]', WARN: 'bg-[#f8ecc9] text-[#6b5a10]', CRIT: 'bg-[#f7dadf] text-[#8e1f33]' }
const SEVERITY_LABEL: Record<string, string> = { INFO: 'Info', WARN: 'Aviso', CRIT: 'Crítico' }

/** Rules of the dashboard "Avisos" panel: conditions on the latest analyses, by category and fermentation phase. */
export function AlertRulesTab() {
  const rules = useResource(() => trackingApi.alertRules(), [])
  const parameters = useResource(() => trackingApi.parameters(true), [])
  const categories = useResource(() => catalogApi.getInternalCategories(), [])
  const [editing, setEditing] = useState<AlertRule | 'new'>()
  const [error, setError] = useState('')

  const save = async (rule: AlertRuleInput) => {
    if (editing && editing !== 'new') await trackingApi.updateAlertRule(editing.id, { ...rule, contentCode: editing.contentCode })
    else await trackingApi.createAlertRule(rule)
    setEditing(undefined)
    rules.reload()
  }
  const toggle = async (rule: AlertRule) => {
    setError('')
    try { await trackingApi.updateAlertRule(rule.id, { name: rule.name, severity: rule.severity, conditions: rule.conditions, categoryCode: rule.categoryCode, contentCode: rule.contentCode, phases: rule.phases, active: !rule.active }); rules.reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido cambiar el aviso.') }
  }
  const remove = async (rule: AlertRule) => {
    if (!confirm(`¿Eliminar el aviso «${rule.name}»?`)) return
    setError('')
    try { await trackingApi.deleteAlertRule(rule.id); rules.reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido eliminar el aviso.') }
  }

  return (
    <section className={`mt-4 ${card}`}>
      <h2 className="text-sm font-semibold">Avisos de seguimiento</h2>
      <p className="mt-1 text-xs text-muted">Reglas que se evalúan con la última analítica de cada depósito ocupado y salen en el panel «Avisos» del dashboard. «Visto» las oculta hasta que llegue una muestra nueva. Los avisos de un solo contenido se crean en la pestaña «Evolución» de ese contenido.</p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#f7e0e6] p-2 text-xs text-[#8e1f33]">{error}</p>}
      <ul className="mt-4 space-y-2">
        {(rules.data ?? []).map((rule) => (
          <li key={rule.id} className={`rounded-xl border border-border p-3 text-xs ${rule.active ? '' : 'opacity-60'}`}>
            <div className="flex flex-wrap items-center gap-2">
              <strong>{rule.name}</strong>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY[rule.severity]}`}>{SEVERITY_LABEL[rule.severity]}</span>
              {rule.contentCode && <span className="rounded-full bg-plum-soft px-2 py-0.5 text-[10px] font-semibold text-plum">Solo {rule.contentCode}</span>}
              {rule.categoryName && <span className="rounded-full bg-[#eee9f4] px-2 py-0.5 text-[10px] font-semibold text-[#5b4a72]">{rule.categoryName}</span>}
              <span className="ml-auto flex gap-3">
                <button type="button" className="font-semibold text-plum" onClick={() => void toggle(rule)}>{rule.active ? 'Desactivar' : 'Activar'}</button>
                <button type="button" className="font-semibold text-plum" onClick={() => setEditing(rule)}>Editar</button>
                <button type="button" className="font-semibold text-[#8e1f33]" onClick={() => void remove(rule)}>Eliminar</button>
              </span>
            </div>
            <p className="mt-1 text-copy">{describeRule(rule, parameters.data ?? [])}</p>
            <p className="mt-0.5 text-[11px] text-muted">{rule.phases.length ? `Solo si la fermentación está: ${rule.phases.map((phase) => fermentationLabels[phase] ?? phase).join(', ')}` : 'En cualquier fase'}</p>
          </li>
        ))}
        {rules.data?.length === 0 && <li className="text-xs text-muted">Aún no hay avisos.</li>}
      </ul>
      {!editing && <button type="button" onClick={() => setEditing('new')} className="mt-4 rounded-xl bg-plum px-4 py-2 text-xs font-semibold text-white">Nuevo aviso</button>}
      {editing && (
        <div className="mt-4">
          <AlertRuleForm key={editing === 'new' ? 'new' : editing.id} parameters={parameters.data ?? []} categories={categories.data ?? []} initial={editing === 'new' ? undefined : editing} contentCode={editing !== 'new' ? editing.contentCode ?? undefined : undefined} onSave={save} onCancel={() => setEditing(undefined)} />
        </div>
      )}
    </section>
  )
}
