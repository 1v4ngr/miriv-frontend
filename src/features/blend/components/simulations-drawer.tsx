import { useState } from 'react'
import { Copy, Trash2, X } from 'lucide-react'
import { ErrorState, LoadingState } from '../../../components/ui/page-state'
import { useResource } from '../../../hooks/use-resource'
import { formatDateTime } from '../../../lib/format'
import { blendApi } from '../services/blend-api'

interface Props { canWrite: boolean; onOpen: (id: string) => void; onClose: () => void }

export function SimulationsDrawer({ canWrite, onOpen, onClose }: Props) {
  const list = useResource(() => blendApi.list(), [])
  const [error, setError] = useState('')
  const act = async (action: () => Promise<unknown>) => {
    setError('')
    try { await action(); list.reload() } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido completar la acción.') }
  }
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}>
    <aside role="dialog" aria-modal="true" aria-label="Mis simulaciones" onMouseDown={(event) => event.stopPropagation()} className="flex h-full w-[400px] max-w-full flex-col border-l border-border bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-border p-4"><h2 className="text-sm font-semibold">Simulaciones guardadas</h2><button type="button" onClick={onClose} aria-label="Cerrar"><X className="size-4" /></button></header>
      <div className="flex-1 space-y-2 overflow-y-auto p-4 text-xs">
        {error && <p role="alert" className="rounded-xl bg-[#f7e0e6] p-2 text-[#8e1f33]">{error}</p>}
        {list.loading && <LoadingState label="Cargando…" />}
        {list.error && <ErrorState message={list.error} onRetry={list.reload} />}
        {list.data?.length === 0 && <p className="text-muted">Todavía no has guardado ninguna simulación.</p>}
        {list.data?.map((item) => (
          <div key={item.id} className="rounded-xl border border-border p-3">
            <div className="flex items-start justify-between gap-2">
              <button type="button" onClick={() => onOpen(item.id)} className="text-left font-semibold text-plum hover:underline">{item.name}</button>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.status === 'CONVERTED' ? 'bg-[#dceadf] text-[#1f5c3a]' : 'bg-[#eee9f4] text-[#5b4a72]'}`}>{item.status === 'CONVERTED' ? 'Convertida' : 'Borrador'}</span>
            </div>
            <p className="mt-1 text-[11px] text-muted">{[item.destinationDepositCode && `Destino ${item.destinationDepositCode}`, item.author, formatDateTime(item.updatedAt)].filter(Boolean).join(' · ')}</p>
            {item.taskCode && <span className="mt-1 block text-[11px] text-muted">Vinculada a tarea {item.taskCode}</span>}
            {canWrite && (
              <div className="mt-2 flex gap-3 text-[11px]">
                <button type="button" className="flex items-center gap-1 font-semibold text-plum" onClick={() => act(() => blendApi.duplicate(item.id))}><Copy className="size-3.5" />Duplicar</button>
                {item.status === 'DRAFT' && <button type="button" className="flex items-center gap-1 font-semibold text-[#8e1f33]" onClick={() => { if (confirm(`¿Eliminar «${item.name}»?`)) void act(() => blendApi.remove(item.id)) }}><Trash2 className="size-3.5" />Eliminar</button>}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
    </div>
  )
}
