import { Activity, FileText, FlaskConical, Home, Settings, Wine } from 'lucide-react'
import type { NavigationBadges } from '../hooks/use-navigation-badges'
import type { CurrentUserProfile } from '../../../services/profile-api'

interface NavigationItem {
  label: string
  icon: typeof Home
  badgeKey?: keyof NavigationBadges
}

interface WorkHomeSidebarProps {
  activeItem: string
  onNavigate: (item: string) => void
  badges?: NavigationBadges
  profile?: CurrentUserProfile
}

export const navigationItems: NavigationItem[] = [
  { label: 'Inicio', icon: Home },
  { label: 'Bodega', icon: Wine },
  { label: 'Laboratorio', icon: FlaskConical, badgeKey: 'laboratory' },
  { label: 'Seguimiento', icon: Activity, badgeKey: 'tracking' },
  { label: 'Informes', icon: FileText },
  { label: 'Administración', icon: Settings },
]

export function WorkHomeSidebar({ activeItem, onNavigate, badges = {}, profile }: WorkHomeSidebarProps) {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-white/95 px-4 py-6 lg:flex lg:flex-col" aria-label="Navegación principal">
      <header className="px-2">
        <p className="font-mono text-[15px] font-semibold uppercase tracking-wider text-plum">MIRIV</p>
        <p className="mt-1 text-[11px] leading-tight text-muted">{profile?.centerName ?? 'Cargando…'}</p>
      </header>
      <nav className="mt-6 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = item.label === activeItem
          const badge = item.badgeKey ? badges[item.badgeKey] : undefined
          return (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate(item.label)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-[12.5px] font-semibold transition ${isActive ? 'bg-plum-soft text-plum' : 'text-copy hover:bg-plum-soft/60'}`}
            >
              <span className="flex items-center gap-2">
                <Icon className={`size-4 ${isActive ? 'text-plum' : 'text-[#b8a7af]'}`} aria-hidden="true" />
                {item.label}
              </span>
              {badge ? <span className="rounded-full bg-[#f7dadf] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#8e1f33]">{badge}</span> : null}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}