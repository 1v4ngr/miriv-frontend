import { memo, useEffect, useState } from 'react'
import { Copy, Globe2, GripVertical, Maximize2, Settings2, Trash2, X } from 'lucide-react'
import type { GlobalFilters, WidgetConfig } from '../types'
import { WIDGETS } from '../widgets'
import type { WidgetDefinition } from '../widgets/types'
import { Portal } from './portal'
import { WidgetErrorBoundary } from './widget-error-boundary'
import { WidgetSettingsDrawer } from './widget-settings-drawer'

interface Props {
  widget: WidgetConfig
  editing: boolean
  globals: GlobalFilters
  onChange: (next: WidgetConfig) => void
  onDuplicate: (id: string) => void
  onRemove: (id: string) => void
  onReplace: (id: string, widgets: WidgetConfig[]) => void
  onNavigate: (path: string) => void
  /** Keyboard editing: arrows move the panel, Shift + arrows resize it (deltas in grid cells). */
  onNudge: (id: string, dx: number, dy: number, dw: number, dh: number) => void
}

const icon = 'widget-no-drag flex size-7 items-center justify-center rounded-lg text-muted hover:bg-plum-soft hover:text-plum'

/** Common chrome of every panel: drag handle, editable title, settings, maximize, duplicate, delete. */
function Frame({ widget, editing, globals, onChange, onDuplicate, onRemove, onReplace, onNavigate, onNudge }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(widget.title)
  const { View } = WIDGETS[widget.type] as unknown as WidgetDefinition<WidgetConfig>

  useEffect(() => {
    if (!maximized) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMaximized(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [maximized])

  const commitTitle = () => {
    setRenaming(false)
    const title = draft.trim()
    if (title && title !== widget.title) onChange({ ...widget, title })
    else setDraft(widget.title)
  }
  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (!editing || event.target !== event.currentTarget) return
    const delta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const move = delta[event.key]
    if (!move) return
    event.preventDefault()
    if (event.shiftKey) onNudge(widget.id, 0, 0, move[0], move[1])
    else onNudge(widget.id, move[0], move[1], 0, 0)
  }
  const body = (
    <WidgetErrorBoundary resetKey={widget.id}>
      <View widget={widget} onChange={onChange} globals={globals} onNavigate={onNavigate} openSettings={() => setSettingsOpen(true)} onReplace={(widgets) => onReplace(widget.id, widgets)} />
    </WidgetErrorBoundary>
  )

  return (
    <section role="region" aria-label={widget.title} tabIndex={0} onKeyDown={onKeyDown} className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-plum">
      <header className={`widget-drag flex h-10 shrink-0 items-center gap-1 border-b border-border px-2 ${editing ? 'cursor-move bg-[#fbf7f9]' : ''}`}>
        {editing && <GripVertical className="size-4 shrink-0 text-muted" aria-hidden="true" />}
        {renaming ? (
          <input autoFocus value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={commitTitle}
            onKeyDown={(event) => { if (event.key === 'Enter') commitTitle(); if (event.key === 'Escape') { setRenaming(false); setDraft(widget.title) } }}
            onMouseDown={(event) => event.stopPropagation()} className="widget-no-drag min-w-0 flex-1 rounded-lg border border-border px-2 py-0.5 text-xs font-semibold" />
        ) : (
          <h3 title="Doble clic para renombrar" onDoubleClick={() => { setDraft(widget.title); setRenaming(true) }} className="min-w-0 flex-1 truncate text-xs font-semibold">{widget.title}</h3>
        )}
        {widget.followGlobal && <span title="Sigue los filtros globales" className="flex shrink-0 items-center gap-1 rounded-full bg-plum-soft px-2 py-0.5 text-[10px] font-semibold text-plum"><Globe2 className="size-3" aria-hidden="true" />Global</span>}
        <button type="button" className={icon} aria-label="Ajustes del panel" onMouseDown={(event) => event.stopPropagation()} onClick={() => setSettingsOpen(true)}><Settings2 className="size-4" /></button>
        <button type="button" className={icon} aria-label="Ampliar panel" onMouseDown={(event) => event.stopPropagation()} onClick={() => setMaximized(true)}><Maximize2 className="size-4" /></button>
        <button type="button" className={icon} aria-label="Duplicar panel" onMouseDown={(event) => event.stopPropagation()} onClick={() => onDuplicate(widget.id)}><Copy className="size-4" /></button>
        <button type="button" className={icon} aria-label="Eliminar panel" onMouseDown={(event) => event.stopPropagation()} onClick={() => { if (confirm(`¿Eliminar el panel «${widget.title}»?`)) onRemove(widget.id) }}><Trash2 className="size-4" /></button>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">{body}</div>
      {settingsOpen && <Portal><WidgetSettingsDrawer widget={widget} onChange={onChange} onReplace={(widgets) => onReplace(widget.id, widgets)} onClose={() => setSettingsOpen(false)} /></Portal>}
      {maximized && (
        <Portal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2e262a]/30 p-4" onMouseDown={() => setMaximized(false)}>
        <div role="dialog" aria-modal="true" aria-label={`${widget.title} ampliado`} onMouseDown={(event) => event.stopPropagation()} className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
          <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
            <h3 className="text-sm font-semibold">{widget.title}</h3>
            <button type="button" onClick={() => setMaximized(false)} className="flex items-center gap-1 text-xs font-semibold text-plum"><X className="size-4" />Cerrar</button>
          </header>
          <div className="min-h-0 flex-1 overflow-auto">{body}</div>
        </div>
        </div>
        </Portal>
      )}
    </section>
  )
}

export const WidgetFrame = memo(Frame)
