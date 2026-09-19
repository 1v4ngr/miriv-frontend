import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FolderOpen, Save } from 'lucide-react'
import { ErrorState, LoadingState } from '../../../components/ui/page-state'
import { useCan } from '../../../hooks/use-permissions'
import { useCurrentProfile } from '../../../hooks/use-current-profile'
import { useResource } from '../../../hooks/use-resource'
import { formatLiters } from '../../../lib/format'
import { cellarApi } from '../../cellar/services/cellar-api'
import { activeOccupation } from '../../cellar/utils'
import { DepositPicker } from '../../dashboard/components/deposit-picker'
import { TrackingTabs } from '../../tracking/components/tracking-tabs'
import { trackingApi } from '../../tracking/services/tracking-api'
import { AdditionsPanel } from '../components/additions-panel'
import { ChecksList } from '../components/checks-list'
import { ComponentList } from '../components/component-list'
import { ConvertDialog } from '../components/convert-dialog'
import { ResultChart } from '../components/result-chart'
import { ResultTable } from '../components/result-table'
import { SimulationsDrawer } from '../components/simulations-drawer'
import { SolverPanel, type SolverSettings } from '../components/solver-panel'
import { blocksConversion, checkBlend, type Destination } from '../checks'
import { simulateBlend } from '../engine'
import { blendApi, type BlendPayload, type BlendView } from '../services/blend-api'
import { toComponent, type Addition, type ParameterMeta, type WineComponent } from '../types'

interface Props { route: string; onNavigate: (path: string) => void }

interface State {
  id?: string
  name: string
  version?: number
  status: 'DRAFT' | 'CONVERTED'
  taskCode: string | null
  components: WineComponent[]
  additions: Addition[]
  destinationCode: string | null
  solver: SolverSettings
}

const DEFAULT_CHART = ['VOLATILE_ACIDITY', 'ETHANOL', 'TOTAL_ACIDITY', 'PH', 'FREE_SO2']
const emptyState = (): State => ({
  name: `Mezcla ${new Date().toLocaleDateString('es-ES')}`, status: 'DRAFT', taskCode: null, components: [], additions: [], destinationCode: null,
  solver: { targets: [], goal: { kind: 'MAX_VOLUME' }, totalMin: null, totalMax: null },
})
const card = 'rounded-2xl border border-border bg-white p-4'
const button = 'flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold hover:bg-plum-soft disabled:opacity-50'

/** Half of what a tank holds, rounded to 10 L: a reasonable first guess when a tank is added. */
const initialLiters = (available: number | null) => (available === null ? 0 : Math.round(available / 2 / 10) * 10)

function toPayload(state: State): BlendPayload {
  return {
    components: state.components.map((component) => ({ contentCode: component.id, depositCode: component.depositCode ?? '', volumeLiters: component.volumeLiters })),
    additions: state.additions,
    targets: state.solver.targets,
    goal: state.solver.goal,
    totalMin: state.solver.totalMin,
    totalMax: state.solver.totalMax,
  }
}

export function BlendPage({ route, onNavigate }: Props) {
  const [state, setState] = useState<State>(emptyState)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [converting, setConverting] = useState(false)
  const [chartParameters, setChartParameters] = useState(DEFAULT_CHART)
  const canWrite = useCan('MOVEMENT_PLAN')
  const profile = useCurrentProfile()
  const started = useRef(false)

  const catalogResource = useResource(() => trackingApi.parameters(true), [])
  const overview = useResource(() => trackingApi.overview(['DENSITY']), [])
  const deposits = useResource(() => cellarApi.getDeposits(), [])
  const catalog: ParameterMeta[] = useMemo(() => catalogResource.data ?? [], [catalogResource.data])
  const rows = overview.data?.rows ?? []

  const mutate = useCallback((change: (current: State) => State) => { setState(change); setDirty(true); setNotice('') }, [])

  /** Adds tanks (or rebuilds them from a saved payload) using their latest analyses. */
  const loadComponents = useCallback(async (codes: string[], volumes?: Record<string, number>) => {
    if (codes.length === 0) return [] as WineComponent[]
    const latest = await trackingApi.latest(codes)
    return latest.map((content) => toComponent(content, volumes?.[content.content] ?? initialLiters(content.volumeLiters)))
  }, [])

  // First load: a saved simulation (#blend/{id}) or a new one, optionally with tanks (#blend?c=A,B).
  useEffect(() => {
    if (started.current) return
    started.current = true
    const [path, query = ''] = route.replace(/^blend\/?/, '').split('?')
    ;(async () => {
      try {
        if (path) {
          const view: BlendView = await blendApi.get(decodeURIComponent(path))
          const volumes = Object.fromEntries(view.payload.components.map((item) => [item.contentCode, item.volumeLiters]))
          const components = await loadComponents(view.payload.components.map((item) => item.contentCode), volumes)
          setState({
            id: view.id, name: view.name, version: view.version, status: view.status, taskCode: view.taskCode, components,
            additions: view.payload.additions ?? [], destinationCode: view.destinationDepositCode,
            solver: { targets: view.payload.targets ?? [], goal: view.payload.goal ?? { kind: 'MAX_VOLUME' }, totalMin: view.payload.totalMin ?? null, totalMax: view.payload.totalMax ?? null },
          })
        } else {
          const codes = (new URLSearchParams(query).get('c') ?? '').split(',').filter(Boolean)
          setState({ ...emptyState(), components: await loadComponents(codes) })
          if (codes.length) setDirty(true)
        }
      } catch (cause) {
        setLoadError(cause instanceof Error ? cause.message : 'No se ha podido cargar la simulación.')
      } finally {
        setLoading(false)
      }
    })()
  }, [route, loadComponents])

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  const frozen = state.status === 'CONVERTED'
  const locked = frozen

  const destination: Destination | null = useMemo(() => {
    if (!state.destinationCode) return null
    const deposit = (deposits.data ?? []).find((item) => item.code === state.destinationCode)
    const occupation = deposit ? activeOccupation(deposit) : undefined
    return {
      depositCode: state.destinationCode, usefulCapacityLiters: deposit?.capacityLiters ?? null, status: deposit?.status ?? 'available',
      occupiedByContent: occupation?.contentCode ?? null, occupiedLiters: occupation?.volumeLiters ?? null,
    }
  }, [state.destinationCode, deposits.data])

  // The component that lives in the destination is used whole.
  const components = useMemo(() => state.components.map((component) => (
    state.destinationCode && component.depositCode === state.destinationCode && component.availableLiters !== null
      ? { ...component, volumeLiters: component.availableLiters } : component
  )), [state.components, state.destinationCode])

  const result = useMemo(() => simulateBlend(components, state.additions, catalog), [components, state.additions, catalog])
  const checks = useMemo(() => checkBlend(components, state.additions, destination, result), [components, state.additions, destination, result])
  const dominant = [...components].sort((a, b) => b.volumeLiters - a.volumeLiters)[0]

  const setSelected = async (codes: string[]) => {
    const current = state.components.map((component) => component.id)
    const added = codes.filter((code) => !current.includes(code))
    setError('')
    try {
      const fresh = await loadComponents(added)
      mutate((previous) => ({ ...previous, components: [...previous.components.filter((component) => codes.includes(component.id)), ...fresh] }))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se han podido cargar las analíticas.')
    }
  }

  const persist = async () => {
    setBusy(true); setError('')
    try {
      const input = { name: state.name.trim() || 'Mezcla sin nombre', destinationDepositCode: state.destinationCode, payload: toPayload({ ...state, components }), result: { parameters: result.parameters.map((item) => ({ code: item.parameter.code, value: item.value, status: item.status })), checks } }
      const saved = state.id ? await blendApi.save(state.id, { ...input, version: state.version }) : await blendApi.create(input)
      setState((current) => ({ ...current, id: saved.id, version: saved.version, name: saved.name }))
      setDirty(false)
      setNotice('Simulación guardada.')
      window.history.replaceState(null, '', `#blend/${saved.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar la simulación.')
    } finally {
      setBusy(false)
    }
  }

  const duplicate = async () => {
    if (!state.id) return
    setBusy(true); setError('')
    try { const copy = await blendApi.duplicate(state.id); window.location.hash = `blend/${copy.id}`; window.location.reload() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido duplicar.') }
    finally { setBusy(false) }
  }

  const convert = async (input: Parameters<typeof blendApi.convert>[1]) => {
    if (!state.id) throw new Error('Guarda la simulación antes de convertirla.')
    if (dirty) await persist()
    const converted = await blendApi.convert(state.id, input)
    setState((current) => ({ ...current, status: converted.status, taskCode: converted.taskCode, version: converted.version }))
    setConverting(false)
    setNotice(`Tarea ${converted.taskCode} creada con ${converted.plannedMovements.length} traslado(s) previsto(s).`)
  }

  const openSimulation = (id: string) => {
    if (dirty && !confirm('Hay cambios sin guardar. ¿Abrir otra simulación igualmente?')) return
    window.location.hash = `blend/${id}`
    window.location.reload()
  }
  const startNew = () => {
    if (dirty && !confirm('Hay cambios sin guardar. ¿Empezar una simulación nueva?')) return
    window.location.hash = 'blend'
    window.location.reload()
  }

  if (loading) return <LoadingState label="Cargando simulador…" />
  if (loadError) return <ErrorState message={loadError} onRetry={() => window.location.reload()} />

  const convertDisabledReason = !canWrite ? 'Necesitas el permiso «Guardar y cancelar movimientos previstos».'
    : frozen ? 'Ya está convertida en tarea.'
    : !state.destinationCode ? 'Elige el depósito destino.'
    : blocksConversion(checks) ? 'Hay comprobaciones que bloquean (o agua).'
    : ''
  const destinationOptions = [
    ...components.filter((component) => component.depositCode).map((component) => ({ code: component.depositCode as string, label: `${component.depositCode} · usa todo su vino`, group: 'Depósitos de la mezcla' })),
    ...(deposits.data ?? []).filter((deposit) => deposit.status === 'available' && !components.some((component) => component.depositCode === deposit.code))
      .map((deposit) => ({ code: deposit.code, label: `${deposit.code} · vacío · ${formatLiters(deposit.capacityLiters)} L`, group: 'Depósitos vacíos' })),
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-4 pb-8">
      <TrackingTabs active="blend" />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] text-muted">Seguimiento</p>
          <h1 className="mt-1 text-[23px] font-semibold">Simulador de mezclas</h1>
          <p className="mt-1 text-xs text-muted">Prueba qué saldría de mezclar depósitos o de añadir agua, ácido o SO₂ antes de mover vino. Todo se calcula al momento.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={button} onClick={() => setDrawer(true)}><FolderOpen className="size-3.5" />Mis simulaciones</button>
          <button type="button" className={button} onClick={startNew}>Nueva</button>
        </div>
      </header>

      <section className={`${card} flex flex-wrap items-end gap-3`} aria-label="Simulación">
        <label className="grid min-w-[220px] flex-1 gap-1 text-[11px] font-semibold text-muted">Nombre
          <input value={state.name} disabled={frozen} onChange={(event) => mutate((current) => ({ ...current, name: event.target.value }))} className="rounded-xl border border-border px-3 py-1.5 text-sm font-semibold text-copy" />
        </label>
        {canWrite
          ? <>
              <button type="button" className={button} disabled={busy || frozen} onClick={persist}><Save className="size-3.5" />{state.id ? 'Guardar cambios' : 'Guardar'}</button>
              <button type="button" className={button} disabled={busy || !state.id} onClick={duplicate}>Duplicar</button>
              <button type="button" disabled={!!convertDisabledReason || !state.id} title={convertDisabledReason || (!state.id ? 'Guarda primero la simulación.' : 'Crear los traslados previstos y la tarea')} onClick={() => setConverting(true)} className="rounded-xl bg-plum px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Convertir en tarea</button>
            </>
          : <p className="text-[11.5px] text-muted">Solo lectura: necesitas el permiso «Guardar y cancelar movimientos previstos» para guardar simulaciones.</p>}
        {state.status === 'CONVERTED' && state.taskCode && <button type="button" onClick={() => onNavigate(`tasks/${encodeURIComponent(state.taskCode!)}`)} className="text-xs font-semibold text-plum underline">Ver tarea {state.taskCode}</button>}
        {dirty && <span className="text-[11px] font-semibold text-[#6b5a10]">Cambios sin guardar</span>}
      </section>
      {(notice || error) && <p role={error ? 'alert' : 'status'} className={`rounded-xl p-2 text-xs ${error ? 'bg-[#f7e0e6] text-[#8e1f33]' : 'bg-[#dceadf] text-[#1f5c3a]'}`}>{error || notice}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className={card}>
            <h2 className="mb-2 text-sm font-semibold">Componentes</h2>
            <DepositPicker rows={rows} selected={state.components.map((component) => component.id)} onChange={(codes) => void setSelected(codes)} label="Depósitos que mezclas" />
            <div className="mt-3">
              <ComponentList components={components} total={result.totalLiters} destinationCode={state.destinationCode} locked={locked}
                onVolume={(id, liters) => mutate((current) => ({ ...current, components: current.components.map((component) => (component.id === id ? { ...component, volumeLiters: liters } : component)) }))}
                onRemove={(id) => mutate((current) => ({ ...current, components: current.components.filter((component) => component.id !== id) }))} />
            </div>
          </section>
          <section className={card}>
            <h2 className="mb-2 text-sm font-semibold">Adiciones</h2>
            <AdditionsPanel additions={state.additions} locked={locked} onChange={(additions) => mutate((current) => ({ ...current, additions }))} />
          </section>
          <section className={card}>
            <h2 className="mb-2 text-sm font-semibold">Destino</h2>
            <select value={state.destinationCode ?? ''} disabled={locked} onChange={(event) => mutate((current) => ({ ...current, destinationCode: event.target.value || null }))} className="w-full rounded-xl border border-border bg-white px-3 py-1.5 text-xs" aria-label="Depósito destino">
              <option value="">Sin decidir</option>
              {destinationOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
            </select>
            {destination?.usefulCapacityLiters != null && <p className="mt-1 text-[11px] text-muted">Capacidad útil {formatLiters(destination.usefulCapacityLiters)} L</p>}
          </section>
        </div>

        <div className="space-y-4">
          <section className={card} aria-label="Resumen">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs">
              <span><strong className="text-base">{formatLiters(result.totalLiters)}</strong> L en total</span>
              <span className="text-muted">vino {formatLiters(result.wineLiters)} L</span>
              {result.waterLiters > 0 && <span className="font-semibold text-[#6b5a10]">agua {formatLiters(result.waterLiters)} L</span>}
              <span className="text-muted">{components.filter((component) => component.volumeLiters > 0).length} depósito(s)</span>
              {checks.some((check) => check.level === 'BLOCK') && <span className="rounded-full bg-[#f7dadf] px-2 py-0.5 font-semibold text-[#8e1f33]">{checks.filter((check) => check.level === 'BLOCK').length} bloqueo(s)</span>}
              {checks.some((check) => check.level === 'WARN') && <span className="rounded-full bg-[#f8ecc9] px-2 py-0.5 font-semibold text-[#6b5a10]">{checks.filter((check) => check.level === 'WARN').length} aviso(s)</span>}
            </div>
          </section>
          <section className={card}>
            <h2 className="mb-2 text-sm font-semibold">Resultado estimado</h2>
            <ResultTable result={result} targets={dominant?.targets ?? []} wanted={state.solver.targets} />
          </section>
          <section className={card}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Comparación con los depósitos</h2>
              <select value="" onChange={(event) => event.target.value && setChartParameters((current) => (current.includes(event.target.value) ? current.filter((code) => code !== event.target.value) : [...current, event.target.value]))} className="rounded-lg border border-border px-2 py-1 text-xs" aria-label="Parámetros del gráfico">
                <option value="">Parámetros del gráfico…</option>
                {result.parameters.filter((item) => item.status === 'OK').map((item) => <option key={item.parameter.code} value={item.parameter.code}>{chartParameters.includes(item.parameter.code) ? '✓ ' : ''}{item.parameter.name}</option>)}
              </select>
            </div>
            <ResultChart components={components} result={result} parameters={chartParameters} />
          </section>
          <section className={card}>
            <h2 className="mb-2 text-sm font-semibold">Comprobaciones</h2>
            <ChecksList checks={checks} />
          </section>
          <section className={card}>
            <h2 className="mb-2 text-sm font-semibold">Buscar proporciones</h2>
            <SolverPanel components={components} catalog={catalog} settings={state.solver} locked={locked}
              onChange={(solver) => mutate((current) => ({ ...current, solver }))}
              onApply={(volumes) => mutate((current) => ({ ...current, components: current.components.map((component) => ({ ...component, volumeLiters: volumes[component.id] ?? component.volumeLiters })) }))} />
          </section>
        </div>
      </div>

      {drawer && <SimulationsDrawer canWrite={canWrite} onOpen={openSimulation} onNavigate={onNavigate} onClose={() => setDrawer(false)} />}
      {converting && <ConvertDialog defaultResponsible={profile?.username ?? ''} onConvert={convert} onClose={() => setConverting(false)} />}
    </div>
  )
}

