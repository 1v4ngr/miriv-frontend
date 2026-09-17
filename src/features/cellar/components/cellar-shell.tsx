import { useState, type ReactNode } from 'react'
import { WorkHomeHeader } from '../../work-home/components/work-home-header'
import { WorkHomeSidebar } from '../../work-home/components/work-home-sidebar'
import { MobileBottomNav } from '../../work-home/components/mobile-bottom-nav'
import { useNavigationBadges } from '../../work-home/hooks/use-navigation-badges'
import { useCurrentProfile } from '../../../hooks/use-current-profile'
import { AccountMenu } from '../../../components/account-menu'

interface CellarShellProps {
  children: ReactNode
  search: string
  onSearchChange: (value: string) => void
  activeSubsection: 'Depósitos' | 'Lotes' | 'Contenidos' | 'Laboratorio' | 'Seguimiento' | 'Actividad' | 'Incidencias' | 'Tareas' | 'Elaboración' | 'Informes' | 'Administración'
  onNavigate: (path: string) => void
}

export function CellarShell({ children, search, onSearchChange, activeSubsection, onNavigate }: CellarShellProps) {
  const badges = useNavigationBadges()
  const profile = useCurrentProfile()
  const [showAccount, setShowAccount] = useState(false)
  const handleNavigate = (item: string) => {
    if (item === 'Inicio') onNavigate('home')
    if (item === 'Bodega') onNavigate('deposits')
    if (item === 'Laboratorio') onNavigate('laboratory')
    if (item === 'Seguimiento') onNavigate('tracking')
    if (item === 'Actividad') onNavigate('activity')
    if (item === 'Incidencias') onNavigate('incidents')
    if (item === 'Tareas') onNavigate('tasks')
    if (item === 'Elaboración') onNavigate('plans')
    if (item === 'Informes') onNavigate('reports')
    if (item === 'Administración') onNavigate('admin')
  }

  const sidebarItem = activeSubsection === 'Laboratorio' || activeSubsection === 'Seguimiento' || activeSubsection === 'Actividad' || activeSubsection === 'Incidencias' || activeSubsection === 'Tareas' || activeSubsection === 'Elaboración' || activeSubsection === 'Informes' || activeSubsection === 'Administración' ? activeSubsection : 'Bodega'
  const showBodegaTabs = activeSubsection !== 'Laboratorio' && activeSubsection !== 'Seguimiento' && activeSubsection !== 'Actividad' && activeSubsection !== 'Incidencias' && activeSubsection !== 'Tareas' && activeSubsection !== 'Elaboración' && activeSubsection !== 'Informes' && activeSubsection !== 'Administración'

  return (
    <main className="min-h-screen bg-[#f2eef1] text-ink">
      <div className="flex min-h-screen w-full">
        <WorkHomeSidebar activeItem={sidebarItem} onNavigate={handleNavigate} badges={badges} profile={profile} />
        <div className="flex min-w-0 flex-1 flex-col">
          <WorkHomeHeader center={profile?.centerName ?? 'Cargando…'} campaign="Campaña 2026" search={search} onSearchChange={onSearchChange} searchPlaceholder={activeSubsection === 'Laboratorio' ? 'Buscar muestra o depósito' : 'Buscar depósito, lote o contenido'} onOpenNotices={() => onNavigate('account')} onOpenProfile={() => setShowAccount(true)} profile={profile} />
          <div className="w-full min-w-0 flex-1 px-4 pb-24 pt-4 sm:px-5 lg:px-6 lg:pb-8">
            {showBodegaTabs && <nav aria-label="Secciones de bodega" className="mb-5 flex items-center gap-1 border-b border-[#e5d9df]">
              {(['Depósitos', 'Lotes'] as const).map((label) => <button key={label} type="button" onClick={() => onNavigate(label === 'Depósitos' ? 'deposits' : 'lots')} aria-current={activeSubsection === label ? 'page' : undefined} className={`border-b-2 px-4 py-2.5 text-[12.5px] font-semibold transition-colors ${activeSubsection === label ? 'border-plum text-plum' : 'border-transparent text-muted hover:text-plum'}`}>{label}</button>)}
            </nav>}
            {children}
          </div>
          <MobileBottomNav activeItem={sidebarItem} onNavigate={handleNavigate} laboratoryMode={activeSubsection === 'Laboratorio'} incidentsMode={activeSubsection === 'Incidencias'} badges={badges} />
        </div>
      </div>
      <AccountMenu open={showAccount} onClose={() => setShowAccount(false)} onLogout={() => onNavigate('login')} />
    </main>
  )
}
