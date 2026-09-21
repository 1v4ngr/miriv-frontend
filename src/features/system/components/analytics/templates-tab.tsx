import { useMemo } from 'react'
import { Plus, Star } from 'lucide-react'
import { useResource } from '../../../../hooks/use-resource'
import { panelsApi, type PanelView } from '../../../laboratory/services/panels-api'
import type { TargetView } from '../../../tracking/services/tracking-api'

interface TemplatesTabProps {
  canEdit: boolean
  onEdit: (panel: PanelView | 'new') => void
  targets: TargetView[]
  editingCode?: string
}

function buildTargetSummary(targets: TargetView[]) {
  let warn = 0
  let crit = 0
  for (const target of targets) {
    if (target.warnMin !== null || target.warnMax !== null) warn += 1
    if (target.critMin !== null || target.critMax !== null) crit += 1
  }
  return { warn, crit }
}

function targetChipsForTemplate(template: PanelView, targets: TargetView[]): Array<{ code: string; name: string }> {
  const codes = new Set(template.parameters.map((p) => p.code))
  const seen = new Map<string, string>()
  for (const target of targets) {
    if (!codes.has(target.parameter)) continue
    if (!seen.has(target.parameter)) seen.set(target.parameter, target.parameterName)
  }
  return Array.from(seen, ([code, name]) => ({ code, name }))
}

const card = 'rounded-2xl border border-border bg-white p-4'

/** Templates listing card grid: each tile exposes the parameter count and how many targets apply to it. */
export function TemplatesTab({ canEdit, onEdit, targets, editingCode }: TemplatesTabProps) {
  const panels = useResource(() => panelsApi.panels(), [])
  const summary = useMemo(() => buildTargetSummary(targets), [targets])

  if (panels.loading) return <p className="p-4 text-center text-xs text-muted">Cargando plantillas…</p>

  const list = panels.data ?? []
  if (list.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-xs text-muted">
        Aún no hay plantillas.
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-end">
        {canEdit && (
          <button
            type="button"
            onClick={() => onEdit('new')}
            className="flex min-h-9 items-center gap-1 rounded-xl bg-plum px-3 text-xs font-semibold text-white"
          >
            <Plus className="size-3.5" />Nueva plantilla
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((panel) => {
          const targetChips = targetChipsForTemplate(panel, targets)
          return (
            <div
              key={panel.code}
              className={`${card} text-left transition ${canEdit ? 'cursor-pointer hover:border-plum' : ''} ${panel.active ? '' : 'opacity-60'} ${editingCode === panel.code ? 'opacity-40' : ''}`}
              onClick={canEdit ? () => onEdit(panel) : undefined}
              role={canEdit ? 'button' : undefined}
              tabIndex={canEdit ? 0 : undefined}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{panel.name}</p>
                  <p className="font-mono text-[10.5px] text-muted">{panel.code}{panel.active ? '' : ' · desactivada'}</p>
                </div>
                <span className="rounded-full bg-plum-soft px-2 py-0.5 text-[10.5px] font-semibold text-plum">{panel.parameters.length} parámetros</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {panel.categories.length === 0 && (
                  <span className="text-[11px] text-muted">Sin asignar a ningún tipo de contenido</span>
                )}
                {panel.categories.map((category) => (
                  <span key={category.code} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] ${category.isDefault ? 'bg-plum text-white' : 'border border-border text-copy'}`}>
                    {category.isDefault && <Star className="size-2.5" aria-label="por defecto" />}{category.name}
                  </span>
                ))}
              </div>
              <p className="mt-2 line-clamp-2 text-[11px] text-muted">{panel.parameters.map((p) => p.name).join(' · ')}</p>
              {targetChips.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-2">
                  <span className="text-[10.5px] font-semibold uppercase tracking-wide text-muted">Objetivos</span>
                  {targetChips.map((chip) => (
                    <span key={chip.code} className="rounded-full bg-[#f8ecc9] px-2 py-0.5 text-[10px] font-semibold text-[#6b5a10]">{chip.name}</span>
                  ))}
                  <span className="ml-auto text-[10.5px] text-muted">aviso {summary.warn} · crítico {summary.crit}</span>
                </div>
              ) : (
                <p className="mt-3 border-t border-border pt-2 text-[10.5px] text-muted">
                  Sin objetivos definidos → no se colorea la matriz.
                </p>
              )}
              {canEdit && (
                <div className="mt-3 flex justify-end gap-3 border-t border-border pt-2">
                  <button type="button" className="text-xs font-semibold text-plum"
                    onClick={(event) => { event.stopPropagation(); onEdit(panel) }}>Editar</button>
                </div>
              )}
              {canEdit && (
                <p className="mt-2 text-[11px] text-muted">
                  Las plantillas no se eliminan: desactívalas para que dejen de ofrecerse al registrar muestras.
                </p>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
