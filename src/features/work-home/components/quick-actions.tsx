import { ClipboardPlus, Move, Search } from 'lucide-react'

interface QuickActionsProps {
  onAction: (message: string) => void
}

const actions = [
  { label: 'Nuevo análisis', icon: ClipboardPlus, primary: true },
  { label: 'Nuevo movimiento', icon: Move, primary: false },
  { label: 'Buscar depósito', icon: Search, primary: false },
]

export function QuickActions({ onAction }: QuickActionsProps) {
  return (
    <section className="rounded-[20px] border border-border bg-[#fdfbfc] p-5" aria-labelledby="quick-actions-title">
      <h2 id="quick-actions-title" className="mb-3 text-[17px] font-semibold">Accesos rápidos</h2>
      <div className="flex flex-wrap gap-2">
        {actions.map(({ label, icon: Icon, primary }) => <button key={label} type="button" onClick={() => onAction(label)} className={`flex min-h-9 items-center gap-2 rounded-xl px-3 text-[12px] font-semibold transition-colors ${primary ? 'bg-[#f3e7ee] text-plum hover:bg-[#ead8e2]' : 'border border-[#e0d2d9] hover:bg-white'}`}><Icon className="size-3.5" aria-hidden="true" />{label}</button>)}
      </div>
    </section>
  )
}
