import { useResource } from '../../../hooks/use-resource'
import { formatDateTime } from '../../../lib/format'
import { blendApi } from '../../blend/services/blend-api'
import type { BlendShortcutWidget } from '../types'
import type { WidgetProps } from './types'

/** Entry point to the blend simulator, with the latest saved simulations one click away. */
export function BlendShortcutView({ onNavigate }: WidgetProps<BlendShortcutWidget>) {
  const list = useResource(() => blendApi.list(), [])
  const recent = (list.data ?? []).slice(0, 5)
  return (
    <div className="flex h-full flex-col gap-2 p-3">
      <button type="button" onClick={() => onNavigate('blend')} className="rounded-xl bg-plum px-3 py-2 text-xs font-semibold text-white">Nueva simulación</button>
      {recent.length === 0
        ? <p className="text-xs text-muted">Simula mezclas y adiciones antes de mover vino.</p>
        : (
          <ul className="min-h-0 flex-1 divide-y divide-border overflow-auto text-xs">
            {recent.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => onNavigate(`blend/${item.id}`)} className="flex w-full items-center justify-between gap-2 py-1.5 text-left hover:text-plum">
                  <span className="min-w-0 truncate font-semibold">{item.name}</span>
                  <span className="shrink-0 text-[10.5px] text-muted">{item.status === 'CONVERTED' ? 'Convertida' : formatDateTime(item.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
    </div>
  )
}
