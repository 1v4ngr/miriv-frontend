import { useState } from 'react'
import { Activity, FileText, FlaskConical, Home, Settings, Wine } from 'lucide-react'
import type { NavigationBadges } from '../hooks/use-navigation-badges'

interface NavigationItem {
  label: string
  icon: typeof Home
  badgeKey?: keyof NavigationBadges
}

export interface TopNavProps {
  activeItem: string
  onNavigate: (item: string) => void
  badges?: NavigationBadges
}

export const navigationItems: NavigationItem[] = [
  { label: 'Inicio', icon: Home },
  { label: 'Bodega', icon: Wine },
  { label: 'Laboratorio', icon: FlaskConical, badgeKey: 'laboratory' },
  { label: 'Seguimiento', icon: Activity, badgeKey: 'tracking' },
  { label: 'Informes', icon: FileText },
  { label: 'Administración', icon: Settings },
]

/**
 * Main navigation on desktop, inside the top bar. Only the active section shows its name; the others are
 * icons that reveal their name on hover or keyboard focus, so the bar stays compact. On mobile the bottom
 * bar takes over.
 */
export function TopNav({ activeItem, onNavigate, badges = {} }: TopNavProps) {
  // Hover is tracked with pointermove, not CSS :hover: when one label closes the icons slide under a
  // still cursor, and :hover (or pointerenter) would then open whatever lands beneath it, in a cascade.
  // A layout shift fires no pointermove, so only a real movement of the mouse changes the open label.
  const [hovered, setHovered] = useState<string | null>(null)
  return (
    <nav aria-label="Navegación principal" onPointerLeave={() => setHovered(null)} className="hidden items-center gap-0.5 rounded-2xl border border-border bg-white p-1 shadow-[0_1px_2px_rgba(46,38,42,0.05)] lg:flex">
      {navigationItems.map((item) => {
        const Icon = item.icon
        const isActive = item.label === activeItem
        const expanded = isActive || hovered === item.label
        const badge = item.badgeKey ? badges[item.badgeKey] : undefined
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onNavigate(item.label)}
            onPointerMove={(event) => { if (event.pointerType === 'mouse') setHovered(item.label) }}
            onFocus={() => setHovered(item.label)}
            onBlur={() => setHovered(null)}
            aria-current={isActive ? 'page' : undefined}
            className={`group relative flex h-9 items-center rounded-xl px-2.5 text-[12.5px] font-semibold outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-[#e3cdd8] ${isActive ? 'bg-plum-soft text-plum' : expanded ? 'bg-[#f7f1f4] text-plum' : 'text-muted'}`}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {/* Animating grid columns 0fr → 1fr opens exactly the label's width. Opening and closing share the
                same duration and curve, so moving between icons reads as one label handing over to the next. */}
            <span className={`grid transition-[grid-template-columns] duration-[350ms] ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${expanded ? 'grid-cols-[1fr]' : 'grid-cols-[0fr]'}`}>
              <span className={`min-w-0 overflow-hidden whitespace-nowrap transition-opacity motion-reduce:transition-none ${expanded ? 'opacity-100 delay-100 duration-[250ms]' : 'opacity-0 duration-150'}`}><span className="pl-2">{item.label}</span></span>
            </span>
            {badge ? <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-[#b3263e] px-1 font-mono text-[9px] font-semibold leading-4 text-white ring-2 ring-white" aria-label={`${badge} pendientes`}>{badge}</span> : null}
          </button>
        )
      })}
    </nav>
  )
}
