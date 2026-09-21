import { useMemo } from 'react'
import { Plus } from 'lucide-react'
import { useResource } from '../../../../hooks/use-resource'
import { fermentationLabels } from '../../../../lib/labels'
import { formatNumber } from '../../../../lib/format'
import { catalogApi } from '../../../../services/catalog-api'
import { trackingApi, type TargetView } from '../../../tracking/services/tracking-api'

interface TargetsTabProps {
  canEdit: boolean
  onEdit: (target: TargetView | 'new') => void
  onAskDelete: (target: TargetView) => void
  deletingId?: string
}

const LIMITS = ['warnMin', 'warnMax', 'critMin', 'critMax'] as const
type Limit = (typeof LIMITS)[number]
const LIMIT_LABEL: Record<Limit, string> = {
  warnMin: 'Aviso mín.', warnMax: 'Aviso máx.', critMin: 'Crítico mín.', critMax: 'Crítico máx.',
}

/** Global / category / phase analytical targets. Renders the table only; the modal lives in the parent. */
export function TargetsTab({ canEdit, onEdit, onAskDelete, deletingId }: TargetsTabProps) {
  const targets = useResource(() => trackingApi.listTargets(), [])
  const sorted = useMemo(() => {
    const list = [...(targets.data ?? [])]
    list.sort((a, b) => `${a.parameterName}`.localeCompare(`${b.parameterName}`, 'es'))
    return list
  }, [targets.data])

  return (
    <>
      <div className="flex justify-end">
        {canEdit && (
          <button
            type="button"
            onClick={() => onEdit('new')}
            className="flex min-h-9 items-center gap-1 rounded-xl bg-plum px-3 text-xs font-semibold text-white"
          >
            <Plus className="size-3.5" />Nuevo objetivo
          </button>
        )}
      </div>
      {targets.error && <p role="alert" className="text-xs text-[#8e1f33]">{targets.error}</p>}
      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full min-w-[640px] border-collapse text-xs">
          <thead>
            <tr className="border-y border-border bg-[#fbf7f9] text-left text-[11px] text-muted">
              <th className="px-3 py-2">Parámetro</th>
              <th className="px-3 py-2">Categoría</th>
              <th className="px-3 py-2">Fase</th>
              {LIMITS.map((key) => <th key={key} className="px-3 py-2">{LIMIT_LABEL[key]}</th>)}
              {canEdit && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {targets.loading && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted">Cargando objetivos…</td></tr>
            )}
            {!targets.loading && sorted.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-muted">Aún no hay objetivos.</td></tr>
            )}
            {sorted.map((target) => (
              <tr key={target.id} className={`border-b border-border last:border-0 ${deletingId === target.id ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2 font-semibold">
                  {target.parameterName}
                  <span className="ml-1 font-normal text-muted">{target.unit}</span>
                  {target.note && <div className="font-normal text-muted">{target.note}</div>}
                </td>
                <td className="px-3 py-2">{target.categoryName ?? 'Todas'}</td>
                <td className="px-3 py-2">{target.phase ? (fermentationLabels[target.phase] ?? target.phase) : 'Cualquiera'}</td>
                {LIMITS.map((key) => (
                  <td key={key} className="px-3 py-2 font-mono">{target[key] === null ? '—' : formatNumber(target[key], 2)}</td>
                ))}
                {canEdit && (
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <button type="button" onClick={() => onEdit(target)} className="mr-3 text-plum">Editar</button>
                    <button type="button" onClick={() => onAskDelete(target)} className="text-[#8e1f33]">Eliminar</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export const TARGETS_LIMITS = LIMITS
export type { Limit }
