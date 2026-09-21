import { Plus } from 'lucide-react'
import { useResource } from '../../../../hooks/use-resource'
import { fermentationLabels } from '../../../../lib/labels'
import { catalogApi } from '../../../../services/catalog-api'
import { describeRule } from '../../../tracking/components/alert-rule-form'
import { trackingApi, type AlertRule, type AlertRuleInput } from '../../../tracking/services/tracking-api'

interface AlertRulesTabProps {
  canEdit: boolean
  onEdit: (rule: AlertRule | 'new') => void
  onAskDelete: (rule: AlertRule) => void
  onToggle: (rule: AlertRule) => void
  deletingId?: string
  /** Bumped from the parent after every successful write so this list refreshes in place. */
  reloadToken?: number
}

const SEVERITY: Record<string, string> = {
  INFO: 'bg-[#e0ecf5] text-[#1f4f73]',
  WARN: 'bg-[#f8ecc9] text-[#6b5a10]',
  CRIT: 'bg-[#f7dadf] text-[#8e1f33]',
}
const SEVERITY_LABEL: Record<string, string> = { INFO: 'Info', WARN: 'Aviso', CRIT: 'Crítico' }

/** Alert rules list for the global scope (admin). The editing modal lives in the parent. */
export function AlertRulesTab({ canEdit, onEdit, onAskDelete, onToggle, deletingId, reloadToken }: AlertRulesTabProps) {
  const rules = useResource(() => trackingApi.alertRules(), [reloadToken])
  const parameters = useResource(() => trackingApi.parameters(true), [reloadToken])

  const list = rules.data ?? []
  return (
    <>
      {list.length === 0 && !rules.loading && (
        <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-xs text-muted">
          Aún no hay avisos. Crea el primero para vigilar este centro.
        </p>
      )}
      <ul className="mt-0 space-y-2">
        {list.map((rule) => (
          <li
            key={rule.id}
            className={`rounded-xl border border-border p-3 text-xs ${rule.active ? '' : 'opacity-60'} ${deletingId === rule.id ? 'opacity-40' : ''}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <strong>{rule.name}</strong>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${SEVERITY[rule.severity]}`}>{SEVERITY_LABEL[rule.severity]}</span>
              {rule.contentCode && (
                <span className="rounded-full bg-plum-soft px-2 py-0.5 text-[10px] font-semibold text-plum">Solo {rule.contentCode}</span>
              )}
              {rule.categoryName && (
                <span className="rounded-full bg-[#eee9f4] px-2 py-0.5 text-[10px] font-semibold text-[#5b4a72]">{rule.categoryName}</span>
              )}
              {canEdit && (
                <span className="ml-auto flex gap-3">
                  <button type="button" className="font-semibold text-plum" onClick={() => onToggle(rule)}>
                    {rule.active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button type="button" className="font-semibold text-plum" onClick={() => onEdit(rule)}>Editar</button>
                  <button type="button" className="font-semibold text-[#8e1f33]" onClick={() => onAskDelete(rule)}>Eliminar</button>
                </span>
              )}
            </div>
            <p className="mt-1 text-copy">{describeRule(rule, parameters.data ?? [])}</p>
            <p className="mt-0.5 text-[11px] text-muted">
              {rule.phases.length
                ? `Solo si la fermentación está: ${rule.phases.map((phase) => fermentationLabels[phase] ?? phase).join(', ')}`
                : 'En cualquier fase'}
            </p>
          </li>
        ))}
      </ul>
      {canEdit && (
        <button
          type="button"
          onClick={() => onEdit('new')}
          className="mt-4 flex min-h-10 items-center gap-1 rounded-xl bg-plum px-3 text-xs font-semibold text-white"
        >
          <Plus className="size-3.5" />Nuevo aviso
        </button>
      )}
    </>
  )
}

export const ALERT_RULE_INPUT_HELP = 'Se avisa cuando se cumplan todas estas condiciones'
export type { AlertRule, AlertRuleInput }
