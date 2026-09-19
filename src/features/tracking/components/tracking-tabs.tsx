export type TrackingTab = 'dashboard' | 'overview' | 'compare' | 'blend'

const TABS: Array<{ id: TrackingTab; label: string; href: string }> = [
  { id: 'dashboard', label: 'Dashboard', href: '#dashboard' },
  { id: 'overview', label: 'Estado de la bodega', href: '#tracking' },
  { id: 'compare', label: 'Comparador', href: '#tracking/compare' },
  { id: 'blend', label: 'Simulador de mezclas', href: '#blend' },
]

/** Sub-navigation shared by the tracking screens. */
export function TrackingTabs({ active }: { active: TrackingTab }) {
  return (
    <nav aria-label="Secciones de Seguimiento" className="no-scrollbar flex max-w-full gap-2 overflow-x-auto">
      {TABS.map((tab) => (
        <a key={tab.id} href={tab.href} aria-current={tab.id === active ? 'page' : undefined}
          className={`h-9 shrink-0 whitespace-nowrap rounded-xl px-3 text-[12px] font-semibold leading-9 ${tab.id === active ? 'bg-plum-soft text-plum' : 'border border-border text-copy hover:bg-plum-soft'}`}>
          {tab.label}
        </a>
      ))}
    </nav>
  )
}
