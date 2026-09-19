import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { WidgetConfig } from '../types'
import { WIDGETS } from '../widgets'
import type { WidgetDefinition } from '../widgets/types'

interface Props { widget: WidgetConfig; onChange: (next: WidgetConfig) => void; onClose: () => void }

/** Right-hand drawer: common fields (title, follow global filters) plus the settings of the widget type. */
export function WidgetSettingsDrawer({ widget, onChange, onClose }: Props) {
  const { Settings } = WIDGETS[widget.type] as unknown as WidgetDefinition<WidgetConfig>
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [onClose])

  return (
    <aside role="dialog" aria-label={`Ajustes de ${widget.title}`} className="fixed right-0 top-0 z-[60] flex h-full w-[380px] max-w-full flex-col border-l border-border bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-sm font-semibold">Ajustes del panel</h2>
        <button type="button" onClick={onClose} aria-label="Cerrar ajustes"><X className="size-4" /></button>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto p-4 text-xs">
        <label className="grid gap-1 font-semibold text-muted">Título
          <input value={widget.title} onChange={(event) => onChange({ ...widget, title: event.target.value })} className="rounded-xl border border-border px-2 py-1.5 font-normal text-copy" />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={widget.followGlobal} onChange={(event) => onChange({ ...widget, followGlobal: event.target.checked })} className="size-3.5 accent-plum" />
          Seguir filtros globales (periodo, depósitos y categoría)
        </label>
        <Settings widget={widget} onChange={onChange} />
      </div>
      <footer className="border-t border-border p-4">
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-plum px-4 py-2 text-xs font-semibold text-white">Listo</button>
      </footer>
    </aside>
  )
}
