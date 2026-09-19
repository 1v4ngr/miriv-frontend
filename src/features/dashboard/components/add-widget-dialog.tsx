import { X } from 'lucide-react'
import { WIDGET_CATALOG } from '../defaults'
import type { WidgetType } from '../types'

export function AddWidgetDialog({ onPick, onClose }: { onPick: (type: WidgetType) => void; onClose: () => void }) {
  return (
    <div role="dialog" aria-label="Añadir panel" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Añadir panel</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar"><X className="size-4" /></button>
        </div>
        <ul className="mt-3 grid gap-2">
          {WIDGET_CATALOG.map((entry) => (
            <li key={entry.type}>
              <button type="button" onClick={() => onPick(entry.type)} className="w-full rounded-xl border border-border p-3 text-left hover:bg-plum-soft">
                <span className="text-xs font-semibold">{entry.label}</span>
                <span className="mt-0.5 block text-[11.5px] text-muted">{entry.description}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
