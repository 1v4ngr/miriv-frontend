import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Responsive } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'
import { Lock, Maximize, Minimize, Plus, Unlock } from 'lucide-react'
import { ErrorState, LoadingState } from '../../../components/ui/page-state'
import { useResource } from '../../../hooks/use-resource'
import { trackingApi } from '../../tracking/services/tracking-api'
import { TrackingTabs } from '../../tracking/components/tracking-tabs'
import { AddWidgetDialog } from '../components/add-widget-dialog'
import { DashboardTabs } from '../components/dashboard-tabs'
import { GlobalFilterBar } from '../components/global-filter-bar'
import { DashboardContext, type DashboardContextValue } from '../dashboard-context'
import { WidgetFrame } from '../components/widget-frame'
import { newWidget, placeWidget, removeFromLayouts } from '../defaults'
import { useElementSize } from '../hooks/use-element-size'
import { forgetDashboard, markSeeded, useDashboard, type SaveStatus } from '../hooks/use-dashboard'
import { dashboardApi } from '../services/dashboard-api'
import type { Breakpoint, GlobalFilters, GridItem, Layouts, WidgetConfig, WidgetType } from '../types'

interface Props { dashboardId?: string; onNavigate: (path: string) => void }

const BREAKPOINTS = { lg: 1100, md: 700, sm: 0 }
const COLS = { lg: 12, md: 8, sm: 1 }
const DESKTOP_MIN_WIDTH = 700
const MAX_WIDGETS = 30
const DEFAULT_GLOBALS: GlobalFilters = { period: '30', contents: [], category: '' }
const globalsKey = (id: string) => `miriv:dashboard-globals:${id}`
const STATUS_LABEL: Record<SaveStatus, string> = {
  loading: 'Cargando…', saved: 'Guardado ✓', saving: 'Guardando…', error: 'Error al guardar', conflict: 'Cambios en otra ventana',
}
const button = 'flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-plum-soft disabled:opacity-50'

/** Keeps only the fields we persist, so library internals never reach the server. */
function toLayouts(all: Partial<Record<string, readonly GridItem[]>>): Layouts {
  const out: Layouts = {}
  for (const breakpoint of ['lg', 'md', 'sm'] as Breakpoint[]) {
    const items = all[breakpoint]
    if (!items) continue
    out[breakpoint] = items.map((item) => {
      const entry: GridItem = { i: item.i, x: item.x, y: item.y, w: item.w, h: item.h }
      if (item.minW !== undefined) entry.minW = item.minW
      if (item.minH !== undefined) entry.minH = item.minH
      return entry
    })
  }
  return out
}

export function DashboardPage({ dashboardId, onNavigate }: Props) {
  const { summaries, dashboard, status, error, update, flush, retry, reload } = useDashboard(dashboardId)
  // Layout is free by default: panels can be dragged and resized without switching any mode on.
  const [locked, setLocked] = useState(false)
  const editing = !locked
  const [adding, setAdding] = useState(false)
  const [actionError, setActionError] = useState('')
  const [globals, setGlobalsState] = useState<GlobalFilters>(DEFAULT_GLOBALS)
  const overview = useResource(() => trackingApi.overview(['DENSITY']), [])
  // Own ResizeObserver: the library hook kept a stale width when the layout around the grid changed.
  const { ref: containerRef, width } = useElementSize<HTMLDivElement>()
  const mounted = width > 0
  const canvas = useRef<HTMLDivElement>(null)
  const [fullscreen, setFullscreen] = useState(false)

  // Real fullscreen when the browser allows it; otherwise the canvas covers the window (Esc leaves it).
  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement !== null && document.fullscreenElement === canvas.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])
  const [pseudo, setPseudo] = useState(false)
  useEffect(() => {
    if (!pseudo) return
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setPseudo(false) }
    window.addEventListener('keydown', close)
    return () => window.removeEventListener('keydown', close)
  }, [pseudo])
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (pseudo) setPseudo(false)
      else if (canvas.current?.requestFullscreen) await canvas.current.requestFullscreen()
      else setPseudo(true)
    } catch {
      setPseudo((current) => !current)
    }
  }
  const isFull = fullscreen || pseudo

  // Global filters belong to the working session, not to the saved design: they live in this browser.
  useEffect(() => {
    if (!dashboard?.id) return
    try {
      const stored = JSON.parse(localStorage.getItem(globalsKey(dashboard.id)) ?? 'null')
      setGlobalsState(stored && Array.isArray(stored.contents) ? { ...DEFAULT_GLOBALS, ...stored } : DEFAULT_GLOBALS)
    } catch { setGlobalsState(DEFAULT_GLOBALS) }
  }, [dashboard?.id])
  const dashboardKey = dashboard?.id
  const setGlobals = useCallback((next: GlobalFilters) => {
    setGlobalsState(next)
    if (dashboardKey) { try { localStorage.setItem(globalsKey(dashboardKey), JSON.stringify(next)) } catch { /* storage blocked */ } }
  }, [dashboardKey])
  const context = useMemo<DashboardContextValue>(() => ({
    globals, setGlobals, overview: overview.data, focus: (code) => setGlobals({ ...globals, contents: [code] }),
  }), [globals, setGlobals, overview.data])

  const draggable = editing && width >= DESKTOP_MIN_WIDTH

  const changeWidget = useCallback((next: WidgetConfig) => {
    update((current) => ({ ...current, widgets: current.widgets.map((widget) => (widget.id === next.id ? next : widget)) }))
  }, [update])
  const removeWidget = useCallback((id: string) => {
    update((current) => ({ ...current, widgets: current.widgets.filter((widget) => widget.id !== id), layouts: removeFromLayouts(current.layouts, id) }))
  }, [update])
  const duplicateWidget = useCallback((id: string) => {
    update((current) => {
      const source = current.widgets.find((widget) => widget.id === id)
      if (!source) return current
      const copy = { ...source, id: newWidget(source.type).id, title: `${source.title} (copia)` } as WidgetConfig
      return { ...current, widgets: [...current.widgets, copy], layouts: placeWidget(current.layouts, copy) }
    })
  }, [update])
  const replaceWidget = useCallback((id: string, replacements: WidgetConfig[]) => {
    update((current) => {
      const index = current.widgets.findIndex((widget) => widget.id === id)
      if (index < 0) return current
      if (current.widgets.length - 1 + replacements.length > MAX_WIDGETS) {
        setActionError(`Máximo ${MAX_WIDGETS} paneles por dashboard.`)
        return current
      }
      let layouts = removeFromLayouts(current.layouts, id)
      for (const widget of replacements) layouts = placeWidget(layouts, widget)
      const widgets = [...current.widgets]
      widgets.splice(index, 1, ...replacements)
      return { ...current, widgets, layouts }
    })
  }, [update])
  const nudgeWidget = useCallback((id: string, dx: number, dy: number, dw: number, dh: number) => {
    const breakpoint: Breakpoint = width >= BREAKPOINTS.lg ? 'lg' : width >= BREAKPOINTS.md ? 'md' : 'sm'
    const cols = COLS[breakpoint]
    update((current) => {
      const items = current.layouts[breakpoint] ?? []
      const target = items.find((item) => item.i === id)
      if (!target) return current
      const w = Math.min(cols, Math.max(target.minW ?? 1, target.w + dw))
      const h = Math.max(target.minH ?? 1, target.h + dh)
      const moved: GridItem = { ...target, w, h, x: Math.min(Math.max(0, target.x + dx), cols - w), y: Math.max(0, target.y + dy) }
      return { ...current, layouts: { ...current.layouts, [breakpoint]: items.map((item) => (item.i === id ? moved : item)) } }
    })
  }, [update, width])
  const addWidget = (type: WidgetType) => {
    const widget = newWidget(type)
    update((current) => ({ ...current, widgets: [...current.widgets, widget], layouts: placeWidget(current.layouts, widget) }))
    setAdding(false)
    setLocked(false)
  }

  const guarded = async (action: () => Promise<void>) => {
    setActionError('')
    try { await action() } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'No se ha podido completar la acción.') }
  }
  const create = () => guarded(async () => {
    const name = prompt('Nombre del nuevo dashboard')?.trim()
    if (!name) return
    await flush()
    const created = await dashboardApi.create(name, { layouts: {}, widgets: [] })
    markSeeded(created.id)
    forgetDashboard()
    onNavigate(`dashboard/${created.id}`)
  })
  const rename = () => {
    if (!dashboard) return
    const name = prompt('Nuevo nombre del dashboard', dashboard.name)?.trim()
    if (name && name !== dashboard.name) update((current) => ({ ...current, name }))
  }
  const duplicate = () => guarded(async () => {
    if (!dashboard) return
    await flush()
    const copy = await dashboardApi.duplicate(dashboard.id)
    markSeeded(copy.id)
    forgetDashboard()
    onNavigate(`dashboard/${copy.id}`)
  })
  const remove = () => guarded(async () => {
    if (!dashboard || !confirm(`¿Eliminar el dashboard «${dashboard.name}»?`)) return
    await dashboardApi.remove(dashboard.id)
    forgetDashboard(dashboard.id)
    onNavigate('dashboard')
  })
  const makeDefault = () => guarded(async () => {
    if (!dashboard) return
    await flush()
    await dashboardApi.makeDefault(dashboard.id)
    forgetDashboard()
    reload()
  })

  const layouts = dashboard?.layouts
  const onLayoutChange = useCallback((_current: unknown, all: Partial<Record<string, readonly GridItem[]>>) => {
    if (!editing) return   // viewing only: never save layout changes caused by resizing the window
    update((current) => {
      const next = toLayouts(all)
      return JSON.stringify(next) === JSON.stringify(current.layouts) ? current : { ...current, layouts: next }
    })
  }, [editing, update])

  const children = useMemo(() => (dashboard?.widgets ?? []).map((widget) => (
    <div key={widget.id}>
      <WidgetFrame widget={widget} editing={draggable} globals={globals} onChange={changeWidget} onDuplicate={duplicateWidget} onRemove={removeWidget} onReplace={replaceWidget} onNavigate={onNavigate} onNudge={nudgeWidget} />
    </div>
  )), [dashboard?.widgets, draggable, globals, changeWidget, duplicateWidget, removeWidget, replaceWidget, onNavigate, nudgeWidget])

  if (!dashboard) {
    return status === 'error' ? <ErrorState message={error} onRetry={reload} /> : <LoadingState label="Cargando dashboard…" />
  }

  return (
    <DashboardContext.Provider value={context}>
    <div ref={canvas} className={`space-y-3 pb-6 ${isFull ? 'overflow-auto bg-white p-4' : ''} ${pseudo ? 'fixed inset-0 z-40' : ''}`}>
      {!isFull && <TrackingTabs active="dashboard" />}
      {!isFull && (
        <header>
          <p className="text-[11px] text-muted">Seguimiento</p>
          <h1 className="mt-1 text-[23px] font-semibold">Dashboard</h1>
        </header>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="w-full min-w-0 md:w-auto md:flex-1">
          <DashboardTabs summaries={summaries} activeId={dashboard.id} onSwitch={(id) => onNavigate(`dashboard/${id}`)}
            onCreate={create} onRename={rename} onDuplicate={duplicate} onMakeDefault={makeDefault} onRemove={remove} />
        </div>
        <span role="status" className={`text-[11.5px] font-semibold ${status === 'error' || status === 'conflict' ? 'text-[#8e1f33]' : 'text-muted'}`}>
          {STATUS_LABEL[status]}
          {status === 'error' && <button type="button" onClick={retry} className="ml-2 underline">Reintentar</button>}
          {status === 'conflict' && <button type="button" onClick={reload} className="ml-2 underline">Recargar</button>}
        </span>
        <button type="button" className={button} onClick={() => setAdding(true)}><Plus className="size-3.5" />Añadir panel</button>
        <button type="button" className={`${button} hidden md:flex`} onClick={() => setLocked((current) => !current)} aria-pressed={locked}
          title="Con el diseño desbloqueado arrastra los paneles por su cabecera y redimensiónalos desde la esquina inferior derecha. Con un panel enfocado, las flechas lo mueven y Mayús + flechas lo redimensionan.">
          {locked ? <Lock className="size-3.5" /> : <Unlock className="size-3.5" />}{locked ? 'Diseño bloqueado' : 'Diseño libre'}
        </button>
        <button type="button" className={button} onClick={toggleFullscreen} aria-pressed={isFull}>
          {isFull ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}{isFull ? 'Salir de pantalla completa' : 'Pantalla completa'}
        </button>
      </div>
      {(actionError || (status !== 'saved' && status !== 'saving' && status !== 'loading' && error)) && (
        <p role="alert" className="rounded-xl bg-[#f7e0e6] p-2 text-xs text-[#8e1f33]">{actionError || error}</p>
      )}

      <GlobalFilterBar />

      {dashboard.widgets.length === 0 && (
        <p className="rounded-2xl border border-border bg-white p-8 text-center text-xs text-muted">Este dashboard está vacío. Pulsa «Añadir panel» para empezar.</p>
      )}
      <div ref={containerRef}>
        {mounted && (
          <Responsive
            width={width}
            breakpoints={BREAKPOINTS}
            cols={COLS}
            layouts={layouts}
            rowHeight={40}
            margin={[12, 12]}
            dragConfig={{ enabled: draggable, handle: '.widget-drag', cancel: '.widget-no-drag' }}
            resizeConfig={{ enabled: draggable }}
            onLayoutChange={onLayoutChange}
          >
            {children}
          </Responsive>
        )}
      </div>

      {adding && <AddWidgetDialog onPick={addWidget} onClose={() => setAdding(false)} />}
    </div>
    </DashboardContext.Provider>
  )
}
