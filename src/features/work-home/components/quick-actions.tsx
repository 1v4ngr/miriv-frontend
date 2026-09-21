import { ClipboardPlus, Move, Search } from 'lucide-react'
import { Can } from '../../../components/can'

interface QuickActionsProps {
  onAction: (message: string) => void
}

const actions: Array<{ label: string; icon: typeof ClipboardPlus; primary: boolean; permission?: string }> = [
  { label: 'Nuevo análisis', icon: ClipboardPlus, primary: true, permission: 'SAMPLE_REGISTER' },
  { label: 'Nuevo movimiento', icon: Move, primary: false, permission: 'MOVEMENT_REGISTER' },
  { label: 'Buscar depósito', icon: Search, primary: false },
]

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <section className="rounded-[20px] border border-border bg-[#fdfbfc] p-5" aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title" className="mb-3 text-[17px] font-semibold">Accesos rápidos</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {actions.map((action) => (
          <Can key={action.label} permission={action.permission} fallback={null}>
            <button
              type="button"
              onClick={() => onAction(action.label)}
              className={`flex h-[88px] items-center justify-between gap-2 rounded-2xl border px-4 py-3 text-left transition ${action.primary ? 'border-plum bg-plum text-white hover:bg-plum-dark' : 'border-border bg-white text-copy hover:border-plum hover:text-plum'}`}
            >
              <span className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold">{action.label}</span>
                <span className={`text-[11px] ${action.primary ? 'text-white/80' : 'text-muted'}`}>{action.primary ? 'Atajo principal' : 'Acción'}</span>
              </span>
              <action.icon className={`size-6 ${action.primary ? 'text-white' : 'text-plum'}`} aria-hidden="true" />
            </button>
          </Can>
        ))}
      </div>
    </section>
  )
}