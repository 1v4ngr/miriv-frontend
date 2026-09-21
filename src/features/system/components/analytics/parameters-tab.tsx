import { useMemo, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useResource } from '../../../../hooks/use-resource'
import { panelsApi, type ParameterView } from '../../../laboratory/services/panels-api'

interface ParametersTabProps {
  canEdit: boolean
  onEdit: (parameter: ParameterView | 'new') => void
  onAskDelete?: (parameter: ParameterView) => void
  editingId?: string
  deletingId?: string
  /** Bumped from the parent after every successful write so this list refreshes in place. */
  reloadToken?: number
}

/** Catalogue of analysable parameters: code, name, unit, plausibility bounds. Owns no modal — parent renders it. */
export function ParametersTab({ canEdit, onEdit, onAskDelete, editingId, deletingId, reloadToken }: ParametersTabProps) {
  const parameters = useResource(() => panelsApi.parameters(), [reloadToken])
  const [query, setQuery] = useState('')
  const shown = useMemo(() => {
    const list = parameters.data ?? []
    const needle = query.trim().toLowerCase()
    return needle ? list.filter((p) => `${p.code} ${p.name}`.toLowerCase().includes(needle)) : list
  }, [parameters.data, query])

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="relative flex min-h-9 w-full max-w-xs items-center">
          <Search className="pointer-events-none absolute left-2.5 size-3.5 text-muted" aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar parámetro…"
            aria-label="Buscar parámetro"
            className="w-full rounded-xl border border-border bg-white py-2 pl-8 pr-3 text-xs"
          />
        </label>
        {canEdit && (
          <button
            type="button"
            onClick={() => onEdit('new')}
            className="flex min-h-9 items-center gap-1 rounded-xl bg-plum px-3 text-xs font-semibold text-white"
          >
            <Plus className="size-3.5" />Nuevo parámetro
          </button>
        )}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="w-full min-w-[560px] text-left text-xs">
          <thead className="bg-field text-[11px] text-muted">
            <tr>
              <th className="px-3 py-2">Parámetro</th>
              <th className="px-3 py-2">Código</th>
              <th className="px-3 py-2">Unidad</th>
              <th className="px-3 py-2">Decimales</th>
              <th className="px-3 py-2">Plantillas</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {parameters.loading && (
              <tr><td colSpan={7} className="px-3 py-4 text-center text-xs text-muted">Cargando parámetros…</td></tr>
            )}
            {!parameters.loading && shown.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-xs text-muted">Aún no hay parámetros.</td></tr>
            )}
            {shown.map((parameter) => (
              <tr
                key={parameter.code}
                onClick={canEdit ? () => onEdit(parameter) : undefined}
                className={`border-t border-border ${canEdit ? 'cursor-pointer hover:bg-field' : ''} ${editingId === parameter.code ? 'opacity-50' : ''} ${deletingId === parameter.code ? 'opacity-50' : ''}`}
                aria-disabled={editingId === parameter.code}
              >
                <td className="px-3 py-2 font-semibold">{parameter.name}</td>
                <td className="px-3 py-2 font-mono text-[10.5px] text-muted">{parameter.code}</td>
                <td className="px-3 py-2">{parameter.unit || '—'}</td>
                <td className="px-3 py-2">{parameter.decimals}</td>
                <td className="px-3 py-2">{parameter.panels}</td>
                <td className="px-3 py-2">{parameter.active ? 'Activo' : <span className="text-muted">Inactivo</span>}</td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-3">
                    <button
                      type="button"
                      className="text-xs font-semibold text-plum"
                      onClick={(event) => { event.stopPropagation(); onEdit(parameter) }}
                    >Editar</button>
                    {onAskDelete && (
                      <button
                        type="button"
                        className="text-xs font-semibold text-[#8e1f33]"
                        onClick={(event) => { event.stopPropagation(); onAskDelete(parameter) }}
                      >Eliminar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && onAskDelete && (
        <p className="mt-2 text-[11px] text-muted">
          ¿Solo quieres dejarlo de usar? Mantenlo inactivo. Eliminar es definitivo y solo funciona cuando ningún resultado analítico lo sigue usando.
        </p>
      )}
    </>
  )
}
