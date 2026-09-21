import { useState } from 'react'
import { Home, MoreHorizontal, Wine, X } from 'lucide-react'
import { navigationItems } from './work-home-sidebar'
import type { NavigationBadges } from '../hooks/use-navigation-badges'

interface MobileBottomNavProps {
  activeItem: string
  onNavigate: (item: string) => void
  laboratoryMode?: boolean
  badges?: NavigationBadges
}

const items = [
  { label: 'Inicio', icon: Home },
  { label: 'Bodega', icon: Wine },
  { label: 'Más', icon: MoreHorizontal },
]

export function MobileBottomNav({ activeItem, onNavigate, laboratoryMode = false, badges = {} }: MobileBottomNavProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const visibleItems = laboratoryMode ? [items[0], items[1], { label: 'Laboratorio', icon: Home }, items[2]] : items
  const pinned = new Set(['Inicio', 'Bodega', ...(laboratoryMode ? ['Laboratorio'] : [])])
  const menuItems = navigationItems.filter((item) => !pinned.has(item.label))
  const handleTap = (label: string) => { if (label === 'Más') { setMenuOpen(true); return } onNavigate(label) }
  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-1 border-t border-border bg-[#fdfbfc]/95 px-3.5 pb-[max(10px,env(safe-area-inset-bottom))] pt-2.5 shadow-[0_-8px_24px_-20px_rgba(70,40,55,0.4)] backdrop-blur lg:hidden" aria-label="Navegación móvil">
        {visibleItems.map(({ label, icon: Icon }) => { const isActive = label === activeItem || (label === 'Más' && menuItems.some((item) => item.label === activeItem)); return <button key={label} type="button" onClick={() => handleTap(label)} className={`flex h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-[15px] text-[11.5px] ${isActive ? 'bg-[#f3e7ee] font-semibold text-plum' : 'font-medium text-copy'}`} aria-current={isActive ? 'page' : undefined}><Icon className="size-4" aria-hidden="true" />{label}</button> })}
      </nav>
      {menuOpen && (
        <div className="fixed inset-0 z-30 flex items-end bg-[#2e262a]/30 lg:hidden" onMouseDown={() => setMenuOpen(false)}>
          <section role="dialog" aria-modal="true" aria-label="Más secciones" onMouseDown={(event) => event.stopPropagation()} className="max-h-[80vh] w-full overflow-y-auto rounded-t-[24px] bg-[#fdfbfc] p-4 pb-[max(20px,env(safe-area-inset-bottom))] shadow-xl">
            <div className="flex items-center justify-between px-1"><h2 className="text-[15px] font-semibold">Más secciones</h2><button type="button" onClick={() => setMenuOpen(false)} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-plum-soft"><X className="size-4" /></button></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {menuItems.map(({ label, icon: Icon, badgeKey }) => { const badge = badgeKey ? badges[badgeKey] : undefined; return <button key={label} type="button" onClick={() => { setMenuOpen(false); onNavigate(label) }} className={`flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left text-[12.5px] font-semibold ${label === activeItem ? 'border-plum bg-plum-soft text-plum' : 'border-border bg-white text-copy'}`}>
                <span className="flex w-full items-center justify-between"><Icon className={`size-4 ${label === activeItem ? 'text-plum' : 'text-[#b8a7af]'}`} aria-hidden="true" />{badge ? <span className="rounded-full bg-[#f7dadf] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#8e1f33]">{badge}</span> : null}</span>
                {label}
              </button> })}
            </div>
          </section>
        </div>
      )}
    </>
  )
}