import { Activity, Archive, Beaker, ClipboardCheck, FileText, FlaskConical, Home, ListChecks, Settings, Wine } from 'lucide-react'
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
  { label: 'Seguimiento', icon: Activity },
  { label: 'Actividad', icon: ClipboardCheck },
  { label: 'Incidencias', icon: Archive, badgeKey: 'incidents' },
  { label: 'Tareas', icon: ListChecks },
  { label: 'Elaboración', icon: Beaker },
  { label: 'Informes', icon: FileText },
  { label: 'Administración', icon: Settings },
]

export function WorkHomeSidebar({ activeItem, onNavigate, badges = {}, profile }: WorkHomeSidebarProps) {
  return (
    <aside className="hidden w-[210px] shrink-0 flex-col gap-5 border-r border-border bg-[#fdfbfc] px-3 py-5 lg:flex xl:w-[222px] xl:px-4">
      <button type="button" onClick={() => onNavigate('Inicio')} className="flex items-center gap-2.5 px-1.5 text-left" aria-label="Ir a Inicio">
        <span className="flex size-8 items-center justify-center rounded-[11px] bg-[#e8dcea] font-display text-[17px] font-semibold text-plum">M</span>
        <span className="font-display text-[19px] font-semibold tracking-[0.18em] text-[#3d2f36]">MIRIV</span>
      </button>

      <nav className="flex flex-col gap-[3px]" aria-label="Navegación principal">
        {navigationItems.map(({ label, icon: Icon, badgeKey }) => {
          const isActive = label === activeItem
          const badge = badgeKey ? badges[badgeKey] : undefined
          return (
            <button key={label} type="button" onClick={() => onNavigate(label)} className={`flex h-[38px] items-center gap-2.5 rounded-xl px-3 text-left text-[12.5px] transition-colors ${isActive ? 'bg-[#f3e7ee] font-semibold text-plum' : 'font-medium text-copy hover:bg-[#faf4f7]'}`} aria-current={isActive ? 'page' : undefined}>
              <Icon className={`size-4 ${isActive ? 'text-plum' : 'text-[#b8a7af]'}`} aria-hidden="true" />
              <span>{label}</span>
              {badge && <span className="ml-auto rounded-full bg-[#f7dadf] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#8e1f33]">{badge}</span>}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 rounded-2xl bg-[#f7f0f4] p-3.5">
        <span className="text-[12.5px] font-semibold">{profile?.displayName ?? 'Cargando perfil…'}</span>
        <span className="text-[12px] text-muted">{[profile?.jobTitle, profile?.centerName].filter(Boolean).join(' · ')}</span>
      </div>
    </aside>
  )
}
