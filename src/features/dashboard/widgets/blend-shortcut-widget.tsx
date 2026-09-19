import type { WidgetProps } from './types'

/** Entry point to the blend simulator; the list of recent simulations arrives with F7-07. */
export function BlendShortcutView({ onNavigate }: WidgetProps) {
  return (
    <div className="flex h-full flex-col justify-between gap-2 p-3">
      <p className="text-xs text-copy">Simula mezclas y adiciones antes de mover vino.</p>
      <button type="button" onClick={() => onNavigate('blend')} className="rounded-xl bg-plum px-3 py-2 text-xs font-semibold text-white">Abrir simulador</button>
    </div>
  )
}
