import { useMemo } from 'react'
import { AlertCircle, ClipboardPlus, Move, RefreshCw, Search } from 'lucide-react'
import { Can } from '../../../components/can'
import { ActionTile } from '../../../components/ui/action-tile'
import { StatTile } from '../../../components/ui/stat-tile'
import { useCurrentProfile } from '../../../hooks/use-current-profile'
import { formatLiters } from '../../../lib/format'
import { activeOccupation } from '../../cellar/utils'
import { useHomeOverview } from '../components/home/use-home-overview'
import { AttentionList, attentionItems } from '../components/home/attention-list'
import { useAssistantView } from '../../assistant/view-context'
import { setBackTarget } from '../../../lib/back-target'
import { SamplesChart } from '../components/home/samples-chart'
import { CategoryChart } from '../components/home/category-chart'
import { PhaseDistribution } from '../components/home/phase-distribution'
import { CellarMap } from '../components/home/cellar-map'
import { RecentMovements } from '../components/home/recent-movements'

interface WorkHomePageProps {
  onNavigate?: (path: string) => void
}

const FERMENTING = new Set(['ACTIVE', 'SLOW', 'SUSPECTED_STOP'])

const QUICK_ACTIONS = [
  { label: 'Nuevo análisis', short: 'Análisis', icon: ClipboardPlus, path: 'laboratory/new', permission: 'SAMPLE_REGISTER', primary: true },
  { label: 'Movimiento', short: 'Movimiento', icon: Move, path: 'movements', permission: 'MOVEMENT_REGISTER', primary: false },
  { label: 'Buscar depósito', short: 'Depósitos', icon: Search, path: 'deposits', permission: undefined, primary: false },
] as const

/**
 * Home content (inside the shared app shell, so the top bar and navigation stay mounted): what needs
 * attention first, then the state of the cellar. Every block reads endpoints the other
 * screens already use; on phones the blocks stack by priority (attention, analyses, categories, phases,
 * map, movements), on wide screens they sit in two columns.
 */
export function WorkHomePage({ onNavigate }: WorkHomePageProps) {
  const profile = useCurrentProfile()
  const overview = useHomeOverview()
  const data = overview.home
  const go = (path: string) => onNavigate?.(path)
  // Deposits opened from the home come back here, scrolled to the block they were opened from.
  const openDepositFrom = (anchor: string) => (code: string) => {
    const route = `deposits/${encodeURIComponent(code)}`
    setBackTarget(route, { route: 'home', label: 'Volver a inicio', anchor })
    go(route)
  }

  const stats = useMemo(() => {
    const capacity = overview.deposits.reduce((sum, deposit) => sum + deposit.capacityLiters, 0)
    const liters = overview.deposits.reduce((sum, deposit) => sum + (activeOccupation(deposit)?.volumeLiters ?? 0), 0)
    const occupied = overview.deposits.filter((deposit) => activeOccupation(deposit)).length
    const fermenting = [...overview.phaseByDeposit.values()].filter((phase) => phase && (phase.alcoholicStates.some((state) => FERMENTING.has(state)) || phase.malolacticStates.some((state) => FERMENTING.has(state)))).length
    const flagged = overview.tracking?.rows.filter((row) => row.worstStatus === 'CRIT' || row.worstStatus === 'WARN') ?? []
    const critical = flagged.filter((row) => row.worstStatus === 'CRIT').length
    const pending = data?.metrics.find((metric) => metric.label === 'PENDING_VALIDATIONS')?.value ?? '—'
    return { capacity, liters, occupied, fermenting, flagged: flagged.length, critical, pending }
  }, [overview, data])

  // What the home shows, for the assistant.
  useAssistantView(overview.loading || !data ? null : {
    screen: 'home', title: 'Inicio',
    data: {
      ocupacion: { porcentaje: stats.capacity ? Math.round(stats.liters / stats.capacity * 100) : 0, litros: stats.liters, depositosOcupados: stats.occupied, depositos: overview.deposits.length },
      enFermentacion: stats.fermenting, fueraDeRango: stats.flagged, criticos: stats.critical, analisisPorValidar: stats.pending,
      necesitanAtencion: attentionItems(overview.tracking).slice(0, 15).map((item) => ({ deposito: item.deposit, motivo: item.title, detalle: item.detail })),
      analisisUltimos30Dias: (data.samplesPerDay ?? []).reduce((sum, day) => sum + day.count, 0),
      movimientosRecientes: data.recentActivity.slice(0, 6).map((item) => `${item.at?.slice(0, 10) ?? ''} ${item.type} ${item.destination ?? item.source ?? ''} ${item.liters ?? ''} L`.trim()),
    },
    suggestions: ['¿Qué es lo más urgente hoy?', '¿Qué depósitos debería analizar hoy?', 'Resúmeme el estado de la bodega'],
  })

  if (overview.loading) return <p className="flex items-center justify-center py-20 text-sm text-muted"><RefreshCw className="mr-2 size-4 animate-spin" />Cargando inicio…</p>
  if (!data) return <div className="flex justify-center py-16"><div className="rounded-2xl border border-[#f0d9de] bg-white p-6 text-center text-sm"><AlertCircle className="mx-auto mb-3 size-6 text-[#8e3b4a]" />{overview.error || 'No hay datos disponibles.'}</div></div>

  const dateLabel = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(new Date())
  const percent = stats.capacity ? Math.round(stats.liters / stats.capacity * 100) : 0

  return (
  <div data-intro-stagger className="space-y-3 sm:space-y-4">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0"><h1 className="m-0 text-[20px] font-semibold tracking-tight sm:text-[24px]">Hoy, {dateLabel}</h1><p className="mt-0.5 truncate text-[11.5px] text-muted sm:mt-1 sm:text-[12px]">{data.center} · Campaña {data.campaign} · datos a {data.updatedAt}</p></div>
      <div className="hidden items-center gap-2 sm:flex">
        {QUICK_ACTIONS.map((action) => (
          <Can key={action.label} permission={action.permission} fallback={null}>
            <button type="button" onClick={() => go(action.path)} className={`flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 text-[12px] font-semibold ${action.primary ? 'bg-plum text-white hover:bg-plum-dark' : 'border border-border bg-white text-copy hover:bg-plum-soft'}`}><action.icon className="size-4" aria-hidden="true" />{action.label}</button>
          </Can>
        ))}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 sm:hidden">
      {QUICK_ACTIONS.map((action) => <Can key={action.label} permission={action.permission} fallback={null}><ActionTile icon={action.icon} label={action.short} primary={action.primary} onClick={() => go(action.path)} /></Can>)}
    </div>

    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      <StatTile label="Ocupación" value={`${percent} %`} hint={`${formatLiters(stats.liters)} L · ${stats.occupied}/${overview.deposits.length} dep.`} onClick={() => go('deposits')} />
      <StatTile label="En fermentación" value={stats.fermenting} hint="depósitos" onClick={() => go('tracking')} />
      <StatTile label="Fuera de rango" value={stats.flagged} tone={stats.critical ? 'danger' : stats.flagged ? 'warning' : undefined} hint={stats.critical ? `${stats.critical} crítico${stats.critical === 1 ? '' : 's'}` : 'avisos'} onClick={() => go('tracking')} />
      <StatTile label="Por validar" value={stats.pending} hint="análisis" onClick={() => go('laboratory')} />
    </div>

    {/* Wide screens: analyses beside categories/phases, the full-width map, then attention + movements. Phones: one column in the same spirit (the row wrappers dissolve into the ordered flex column). */}
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="contents xl:grid xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] xl:items-stretch xl:gap-4">
        <div className="order-1 min-w-0 xl:order-none [&>section]:h-full"><SamplesChart days={data.samplesPerDay ?? []} onOpen={() => go('laboratory')} /></div>
        <div className="contents xl:flex xl:min-w-0 xl:flex-col xl:gap-4">
          <div className="order-2 min-w-0 xl:order-none"><CategoryChart deposits={overview.deposits} /></div>
          <div className="order-3 min-w-0 xl:order-none"><PhaseDistribution phases={overview.phases} phaseByDeposit={overview.phaseByDeposit} onOpen={() => go('deposits')} /></div>
        </div>
      </div>
      <div className="order-4 min-w-0 xl:order-none"><CellarMap deposits={overview.deposits} zones={profile?.zones} onOpenDeposit={openDepositFrom('mapa-bodega')} /></div>
      <div className="contents xl:grid xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)] xl:items-stretch xl:gap-4">
        <div className="order-5 min-w-0 xl:order-none [&>section]:h-full"><AttentionList tracking={overview.tracking} onOpenDeposit={openDepositFrom('necesitan-atencion')} onOpenTracking={() => go('tracking')} /></div>
        <div className="order-6 min-w-0 xl:order-none [&>section]:h-full"><RecentMovements items={data.recentActivity} onOpenMovement={(code) => go(`movements/${encodeURIComponent(code)}`)} onOpenAll={() => go('movements')} /></div>
      </div>
    </div>
  </div>
  )
}
