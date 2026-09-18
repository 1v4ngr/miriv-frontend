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
      <div className="flex flex-wrap gap-2">
        {actions.map(({ label, icon: Icon, primary, permission }) => (
          <Can key={label} permission={permission}>
            <button type="button" onClick={() => onAction(label)}
              className={`flex min-h-9 items-center gap-2 rounded-xl px-3 text-[12px] font-semibold transition-colors ${primary ? 'bg-[#f3e7ee] text-plum hover:bg-[#ead8e2]' : 'border border-[#e0d2d9] hover:bg-white'}`}>
              <Icon className="size-3.5" aria-hidden="true" />{label}
            </button>
          </Can>
        ))}
      </div>
    </section>
  )
}