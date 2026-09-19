import { useEffect, useRef, useState } from 'react'
import { Copy, MoreHorizontal, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import type { DashboardSummary } from '../types'

interface Props {
  summaries: DashboardSummary[]
  activeId: string
  onSwitch: (id: string) => void
  onCreate: () => void
  onRename: () => void
  onDuplicate: () => void
  onMakeDefault: () => void
  onRemove: () => void
}

/** One-click switching between dashboards; the less common actions live in the "⋯" menu of the active one. */
export function DashboardTabs({ summaries, activeId, onSwitch, onCreate, onRename, onDuplicate, onMakeDefault, onRemove }: Props) {
  const [menu, setMenu] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const active = summaries.find((item) => item.id === activeId)

  useEffect(() => {
    if (!menu) return
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) setMenu(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false) }
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', escape)
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('keydown', escape) }
  }, [menu])

  const item = 'flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs hover:bg-plum-soft disabled:opacity-40'
  const run = (action: () => void) => () => { setMenu(false); action() }

  return (
    <div ref={root} className="relative flex w-full items-center gap-1">
      <div role="tablist" aria-label="Dashboards" className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {summaries.map((summary) => (
          <button key={summary.id} type="button" role="tab" aria-selected={summary.id === activeId} onClick={() => onSwitch(summary.id)}
            className={`flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors ${summary.id === activeId ? 'bg-plum text-white' : 'bg-white text-copy ring-1 ring-border hover:bg-plum-soft'}`}>
            {summary.isDefault && <Star className="size-3 fill-current" aria-label="Predeterminado" />}{summary.name}
          </button>
        ))}
      </div>
      <button type="button" onClick={onCreate} aria-label="Nuevo dashboard" title="Nuevo dashboard" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-muted ring-1 ring-border hover:bg-plum-soft hover:text-plum"><Plus className="size-4" /></button>
      <button type="button" onClick={() => setMenu((current) => !current)} aria-label="Más acciones del dashboard" aria-expanded={menu} title="Más acciones" className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-muted ring-1 ring-border hover:bg-plum-soft hover:text-plum"><MoreHorizontal className="size-4" /></button>
      {menu && (
        <div role="menu" className="absolute right-0 top-9 z-30 w-52 rounded-xl border border-border bg-white p-1 shadow-lg">
          <button type="button" role="menuitem" className={item} onClick={run(onRename)}><Pencil className="size-3.5" />Renombrar</button>
          <button type="button" role="menuitem" className={item} onClick={run(onDuplicate)}><Copy className="size-3.5" />Duplicar</button>
          <button type="button" role="menuitem" className={item} disabled={active?.isDefault} onClick={run(onMakeDefault)}><Star className="size-3.5" />Hacer predeterminado</button>
          <button type="button" role="menuitem" className={`${item} text-[#8e1f33]`} disabled={summaries.length <= 1} onClick={run(onRemove)}><Trash2 className="size-3.5" />Eliminar</button>
        </div>
      )}
    </div>
  )
}
