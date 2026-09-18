import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowLeft, RefreshCw, X } from 'lucide-react'
import { StatusBadge } from '../../../components/ui/status-badge'
import { AccountMenu } from '../../../components/account-menu'
import { AttentionCard } from '../components/attention-card'
import { MobileBottomNav } from '../components/mobile-bottom-nav'
import { QuickActions } from '../components/quick-actions'
import { RecentActivity } from '../components/recent-activity'
import { WorkHomeHeader } from '../components/work-home-header'
import { WorkHomeSidebar } from '../components/work-home-sidebar'
import { useNavigationBadges } from '../hooks/use-navigation-badges'
import { useCurrentProfile } from '../../../hooks/use-current-profile'
import { workHomeApi } from '../services/work-home-api'
import type { AttentionItem, DashboardMetric, WorkHomeData } from '../types'
import { label as localize, metricLabels } from '../../../lib/labels'

interface WorkHomePageProps {
  onOpenLogin?: () => void
  onNavigate?: (path: string) => void
}

type Filter = 'all' | 'critical' | 'overdue' | 'high'

interface DetailPanel {
  title: string
  description: string
  item?: AttentionItem
  kind: 'attention' | 'notices' | 'action'
}

function MetricCard({ metric }: { metric: DashboardMetric }) {
  // F2-03: the backend sends a code (e.g. URGENT_INCIDENTS); the label map turns it into Spanish.
  const displayLabel = localize(metricLabels, metric.label, metric.label)
  return (
    <article className="flex min-h-[106px] flex-col justify-between rounded-2xl border border-border bg-white p-4">
      <span className="text-[12px] font-semibold text-copy">{displayLabel}</span>
      <span className="font-mono text-[25px] leading-none text-ink">{metric.value}</span>
      {metric.detail && <span className={`text-[11.5px] ${metric.tone === 'warning' ? 'text-[#7a4a22]' : 'text-muted'}`}>{metric.detail}</span>}
    </article>
  )
}

function TasksCard({ data, loading, onRetry }: { data: WorkHomeData['ownTasks']; loading: boolean; onRetry: () => void }) {
  const isAvailable = data.status === 'available'
  return (
    <article className={`flex min-h-[106px] flex-col justify-between rounded-2xl border p-4 ${isAvailable ? 'border-border bg-white' : 'border-[#dedeeb] bg-[#efeff5]'}`}>
      <span className="text-[12px] font-semibold text-[#43435c]">Tareas propias</span>
      <span className={`${isAvailable ? 'font-mono text-[25px]' : 'text-[16px] font-semibold'} leading-none text-[#43435c]`}>{isAvailable ? data.count : 'No disponible'}</span>
      {isAvailable && <span className="text-[11.5px] text-[#4a4a66]">{data.count} abiertas</span>}
      {!isAvailable && <button type="button" disabled={loading} onClick={onRetry} className="flex items-center gap-1 text-left text-[11.5px] font-semibold text-[#4a4a66] hover:text-plum disabled:opacity-60"><RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />{loading ? 'Cargando…' : 'Reintentar'}</button>}
    </article>
  )
}

function MobilePriorityCard({ item, onAction }: { item: AttentionItem; onAction: (item: AttentionItem) => void }) {
  return (
    <article className={`rounded-2xl border bg-white p-4 ${item.priority === 'critical' ? 'border-[#f0d9de]' : 'border-border'}`}>
      <div className="flex items-center justify-between gap-2"><span className="font-mono text-[13px]">{item.containerCode}</span><StatusBadge tone={item.priority}>{item.priorityLabel}</StatusBadge></div>
      <p className="my-2 text-[13px] leading-5">{item.title}</p>
      <p className="m-0 text-[11.5px] leading-4 text-muted">{item.category} · {item.lotCode} · {item.meta}</p>
      <button type="button" onClick={() => onAction(item)} className="mt-3 min-h-10 w-full rounded-xl bg-plum-soft px-3 text-[12px] font-semibold text-plum hover:bg-[#ead8e2]">{item.actionLabel}</button>
    </article>
  )
}

function DetailDrawer({ panel, onClose }: { panel: DetailPanel; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => event.stopPropagation()} className="flex h-full w-full max-w-[410px] flex-col overflow-y-auto border-l border-border bg-[#fdfbfc] p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4"><div><div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">MIRIV · Inicio</div><h2 id="detail-title" className="text-[21px] font-semibold tracking-[-0.02em]">{panel.title}</h2></div><button type="button" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-plum-soft" aria-label="Cerrar panel"><X className="size-4" /></button></div>
        <p className="mt-3 text-[13px] leading-5 text-copy">{panel.description}</p>
        {panel.item && <div className="mt-4 space-y-3 rounded-2xl border border-border bg-white p-4 text-[12.5px]"><div className="flex items-center justify-between"><span className="font-mono text-[13px]">{panel.item.containerCode}</span><StatusBadge tone={panel.item.priority}>{panel.item.priorityLabel}</StatusBadge></div><dl className="grid grid-cols-[95px_1fr] gap-x-3 gap-y-2"><dt className="text-muted">Lote</dt><dd className="m-0 font-mono">{panel.item.lotCode}</dd><dt className="text-muted">Producto</dt><dd className="m-0">{panel.item.category}</dd><dt className="text-muted">Evidencia</dt><dd className="m-0">{panel.item.value ? `${panel.item.value} ${panel.item.valueUnit}` : panel.item.meta}</dd><dt className="text-muted">Contexto</dt><dd className="m-0">{panel.item.detail}</dd></dl><p className="m-0 border-t border-border pt-3 text-[11.5px] leading-4 text-muted">Información de demostración. La decisión enológica requiere revisar el expediente completo.</p></div>}
        {panel.kind === 'notices' && <div className="mt-4 space-y-2">{['DEP-014 · Acidez volátil sobre umbral', 'DEP-021 · Control vencido', 'DEP-007 · Estado pendiente de confirmar', '7 validaciones pendientes en laboratorio'].map((notice) => <div key={notice} className="rounded-xl border border-border bg-white p-3 text-[12.5px]">{notice}</div>)}</div>}
        {panel.kind === 'action' && <div className="mt-4 rounded-2xl border border-border bg-white p-4 text-[12px] leading-5 text-muted">Esta acción abrirá su formulario en la vista correspondiente cuando se implemente. El panel de inicio conserva el contexto de trabajo.</div>}
        <button type="button" onClick={onClose} className="mt-auto pt-8 text-left text-[12px] font-semibold text-plum hover:text-plum-dark"><ArrowLeft className="mr-1 inline size-3.5" />Volver al inicio</button>
      </section>
    </div>
  )
}

export function WorkHomePage({ onOpenLogin, onNavigate }: WorkHomePageProps) {
  const badges = useNavigationBadges()
  const profile = useCurrentProfile()
  const [data, setData] = useState<WorkHomeData>()
  const [isLoading, setIsLoading] = useState(true)
  const [isRetryingTasks, setIsRetryingTasks] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [activeItem, setActiveItem] = useState('Inicio')
  const [panel, setPanel] = useState<DetailPanel>()
  const [error, setError] = useState('')
  const [showAccount, setShowAccount] = useState(false)

  useEffect(() => {
    let mounted = true
    workHomeApi.getWorkHome().then((response) => { if (mounted) setData(response) }).catch(() => { if (mounted) setError('No se ha podido cargar el inicio de trabajo.') }).finally(() => { if (mounted) setIsLoading(false) })
    return () => { mounted = false }
  }, [])

  const filteredItems = useMemo(() => data?.attentionItems.filter((item) => {
    const matchesPriority = filter === 'all' || item.priority === filter
    const haystack = `${item.containerCode} ${item.lotCode} ${item.category} ${item.title} ${item.detail}`.toLocaleLowerCase('es')
    return matchesPriority && haystack.includes(search.trim().toLocaleLowerCase('es'))
  }) ?? [], [data, filter, search])

  const filteredActivity = useMemo(() => data?.recentActivity.filter((item) => `${item.time} ${item.content}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))) ?? [], [data, search])

  const handleNavigate = (item: string) => {
    if (item === 'Bodega') { onNavigate?.('deposits'); return }
    if (item === 'Laboratorio') { onNavigate?.('laboratory'); return }
    if (item === 'Seguimiento') { onNavigate?.('tracking'); return }
    if (item === 'Actividad') { onNavigate?.('activity'); return }
    if (item === 'Incidencias') { onNavigate?.('incidents'); return }
    if (item === 'Tareas') { onNavigate?.('tasks'); return }
    if (item === 'Elaboración') { onNavigate?.('plans'); return }
    if (item === 'Informes') { onNavigate?.('reports'); return }
    if (item === 'Administración') { onNavigate?.('admin'); return }
    setActiveItem(item)
    if (item === 'Inicio') { setPanel(undefined); return }
    setPanel({ kind: 'action', title: item, description: `La sección ${item} forma parte de las siguientes vistas del proyecto. Desde Inicio puedes consultar las prioridades actuales.` })
  }

  const handleAttentionAction = (item: AttentionItem) => setPanel({ kind: 'attention', title: item.actionLabel, description: item.title, item })

  const handleRetryTasks = async () => {
    setIsRetryingTasks(true)
    try { setData(await workHomeApi.getWorkHome({ retryTasks: true })) } catch { setError('No se han podido cargar las tareas.') } finally { setIsRetryingTasks(false) }
  }

  if (isLoading) return <main className="flex min-h-screen items-center justify-center bg-[#f2eef1] text-sm text-muted"><RefreshCw className="mr-2 size-4 animate-spin" />Cargando inicio…</main>
  if (!data) return <main className="flex min-h-screen items-center justify-center bg-[#f2eef1] p-5"><div className="rounded-2xl border border-[#f0d9de] bg-white p-6 text-center text-sm"><AlertCircle className="mx-auto mb-3 size-6 text-[#8e3b4a]" />{error || 'No hay datos disponibles.'}</div></main>

  const dateLabel = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(new Date())
  const filters: { id: Filter; label: string }[] = [{ id: 'all', label: 'Todas' }, { id: 'critical', label: 'Críticas' }, { id: 'overdue', label: 'Vencidas' }, { id: 'high', label: 'Altas' }]

  return (
    <main className="min-h-screen bg-[#f2eef1] text-ink">
      <div className="flex min-h-screen w-full">
        <WorkHomeSidebar activeItem={activeItem} onNavigate={handleNavigate} badges={badges} profile={profile} />
        <div className="flex min-w-0 flex-1 flex-col">
          <WorkHomeHeader center={profile?.centerName ?? data.center} campaign={data.campaign} search={search} onSearchChange={setSearch} onOpenNotices={() => setPanel({ kind: 'notices', title: 'Avisos', description: 'Resumen de avisos sin leer de la campaña actual.' })} onOpenProfile={() => setShowAccount(true)} profile={profile} />
          <div className="w-full min-w-0 flex-1 space-y-5 p-4 pb-24 sm:p-5 lg:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="m-0 text-[22px] font-semibold tracking-tight sm:text-[24px]">Hoy, {dateLabel}</h1><p className="mt-1 text-[12px] text-muted">{data.center} · {data.campaign} · datos de demostración del 16 sep, {data.updatedAt}</p></div><button type="button" onClick={() => onNavigate?.('incidents')} className="min-h-10 rounded-xl bg-plum px-4 text-[12.5px] font-semibold text-white shadow-sm transition hover:bg-plum-dark">Revisar incidencias</button></div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">{data.metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}<TasksCard data={data.ownTasks} loading={isRetryingTasks} onRetry={handleRetryTasks} /></div>
            <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(270px,1fr)]">
              <section className="min-w-0 rounded-[18px] border border-border bg-[#fdfbfc] p-4 sm:p-5" aria-labelledby="attention-title"><div className="flex flex-wrap items-baseline justify-between gap-2"><h2 id="attention-title" className="m-0 text-[16px] font-semibold sm:text-[17px]">Requiere tu atención</h2><span className="text-[11.5px] text-muted">{filteredItems.length} visibles · {data.attentionTotal} en total</span></div><div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar prioridades">{filters.map(({ id, label }) => <button key={id} type="button" onClick={() => setFilter(id)} aria-pressed={filter === id} className={`min-h-8 rounded-lg px-2.5 text-[11.5px] font-semibold transition-colors ${filter === id ? 'bg-plum text-white' : 'border border-border bg-white text-copy hover:bg-plum-soft'}`}>{label}</button>)}</div><div className="mt-3 space-y-2.5"><div className="hidden space-y-2.5 sm:block">{filteredItems.map((item) => <AttentionCard key={item.id} item={item} onAction={handleAttentionAction} />)}</div><div className="space-y-2.5 sm:hidden">{filteredItems.map((item) => <MobilePriorityCard key={item.id} item={item} onAction={handleAttentionAction} />)}</div>{filteredItems.length === 0 && <div className="rounded-xl border border-dashed border-border bg-white p-6 text-center text-[12.5px] text-muted">No hay prioridades que coincidan con la búsqueda.</div>}</div></section>
              <div className="flex min-w-0 flex-col gap-4"><QuickActions onAction={(action) => { if (action === 'Buscar depósito') { onNavigate?.('deposits'); return } if (action === 'Nuevo análisis') { onNavigate?.('laboratory'); return } setPanel({ kind: 'action', title: action, description: `El formulario de ${action.toLocaleLowerCase('es')} pertenece a su módulo. Puedes consultar las prioridades y sus datos desde este inicio.` }) }} /><RecentActivity items={filteredActivity} onOpenAll={() => handleNavigate('Actividad')} /></div>
            </div>
          </div>
          <MobileBottomNav activeItem={activeItem} onNavigate={handleNavigate} badges={badges} />
        </div>
      </div>
      {panel && <DetailDrawer panel={panel} onClose={() => { setPanel(undefined); setActiveItem('Inicio') }} />}
      <AccountMenu open={showAccount} onClose={() => setShowAccount(false)} onLogout={() => onOpenLogin?.()} />
      {error && <div className="fixed bottom-20 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-xl bg-[#8e3b4a] px-4 py-2.5 text-[12px] text-white shadow-lg" role="alert"><AlertCircle className="size-4" />{error}<button type="button" onClick={() => setError('')} aria-label="Cerrar aviso"><X className="size-3.5" /></button></div>}
    </main>
  )
}
