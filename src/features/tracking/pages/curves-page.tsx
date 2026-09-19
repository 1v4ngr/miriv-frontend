import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Download, Star, Trash2 } from 'lucide-react'
import { useResource } from '../../../hooks/use-resource'
import { ErrorState, LoadingState } from '../../../components/ui/page-state'
import { MultiSelect } from '../components/multi-select'
import { SeriesChart, type ChartSeries } from '../components/series-chart'
import { DataTable, DateComparison, LatestComparison } from '../components/comparison-tables'
import { downloadCsv, seriesToCsv } from '../export'
import { loadFavorites, saveFavorites, type Axis, type Favorite, type Mode, type Period } from '../favorites'
import { trackingApi, type SeriesResponse } from '../services/tracking-api'
import { buildChartSeries } from '../build-chart-series'
import { PERIODS, periodStart } from '../period'

interface Props {
  /** "tracking/C-2026-001" (one content) or "tracking/compare?c=A,B&p=PH,DENSITY&…" (shareable comparison). */
  route: string
  onBack: () => void
  onNavigate: (path: string) => void
}

interface ViewState { contents: string[]; parameters: string[]; period: Period; mode: Mode; axis: Axis }

const DEFAULT_PARAMETERS = ['DENSITY', 'VOLATILE_ACIDITY', 'PH']
const EMPTY: SeriesResponse = { contents: [], parameters: [], points: [], targets: [] }
const card = 'rounded-2xl border border-border bg-white p-4'
const select = 'rounded-xl border border-border bg-white px-2 py-1.5 text-xs'

function parseRoute(route: string): ViewState {
  const rest = route.replace(/^tracking\/?/, '')
  const [path, query = ''] = rest.split('?')
  const params = new URLSearchParams(query)
  const list = (key: string) => (params.get(key) ?? '').split(',').map((item) => item.trim()).filter(Boolean)
  const contents = path.startsWith('compare') ? list('c') : path ? [decodeURIComponent(path)] : []
  const period = params.get('per') as Period | null
  return {
    contents,
    parameters: list('p').length ? list('p') : DEFAULT_PARAMETERS,
    period: period && PERIODS.some((option) => option.value === period) ? period : '30',
    mode: params.get('mode') === 'overlay' ? 'overlay' : 'grid',
    axis: params.get('axis') === 'days' ? 'days' : 'date',
  }
}

function toQuery(view: ViewState): string {
  return `c=${view.contents.join(',')}&p=${view.parameters.join(',')}&per=${view.period}&mode=${view.mode}&axis=${view.axis}`
}

export function CurvesPage({ route, onBack, onNavigate }: Props) {
  const [view, setView] = useState<ViewState>(() => parseRoute(route))
  const [showEvents, setShowEvents] = useState(true)
  const [showTargets, setShowTargets] = useState(true)
  const [includeAncestors, setIncludeAncestors] = useState(false)
  const [showRate, setShowRate] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const [favorites, setFavorites] = useState<Favorite[]>(() => loadFavorites())
  const [favoriteName, setFavoriteName] = useState('')
  const patch = (next: Partial<ViewState>) => setView((current) => ({ ...current, ...next }))

  // Keep the URL shareable without re-running the router (replaceState does not fire hashchange).
  useEffect(() => {
    if (view.contents.length) window.history.replaceState(null, '', `#tracking/compare?${toQuery(view)}`)
  }, [view])

  const overview = useResource(() => trackingApi.overview(['DENSITY']), [])
  const parameterList = useResource(() => trackingApi.parameters(), [])

  const contentsKey = view.contents.join(',')
  const parametersKey = view.parameters.join(',')
  const series = useResource(
    () => (view.contents.length && view.parameters.length
      ? trackingApi.series({ contents: view.contents, parameters: view.parameters, from: periodStart(view.period), includeAncestors })
      : Promise.resolve(EMPTY)),
    [contentsKey, parametersKey, view.period, includeAncestors],
  )
  const data = series.data ?? EMPTY
  const codes = data.contents.map((content) => content.code)
  const events = useResource(
    () => (showEvents && codes.length ? trackingApi.events(codes, periodStart(view.period)) : Promise.resolve([])),
    [codes.join(','), showEvents, view.period],
  )

  const contentOptions = useMemo(() => {
    const options = (overview.data?.rows ?? []).map((row) => ({ value: row.content, label: `${row.deposit} · ${row.content}`, hint: row.category ?? undefined }))
    for (const code of view.contents) if (!options.some((option) => option.value === code)) options.push({ value: code, label: code, hint: undefined })
    return options
  }, [overview.data, view.contents])
  const parameterOptions = useMemo(
    () => (parameterList.data ?? []).map((parameter) => ({ value: parameter.code, label: parameter.name, hint: parameter.unit ?? undefined })),
    [parameterList.data],
  )

  const chartSeries = useMemo<ChartSeries[]>(() => buildChartSeries(data), [data])

  const distinctUnits = new Set(data.parameters.map((parameter) => parameter.unit ?? '')).size
  const mode: Mode = view.mode === 'overlay' && distinctUnits <= 2 ? 'overlay' : 'grid'
  const eventList = events.data ?? []
  const hasPoints = data.points.length > 0

  const saveFavorite = () => {
    const name = favoriteName.trim()
    if (!name) return
    const next = [...favorites.filter((favorite) => favorite.name !== name), { name, ...view }]
    setFavorites(next); saveFavorites(next); setFavoriteName('')
  }
  const removeFavorite = (name: string) => {
    const next = favorites.filter((favorite) => favorite.name !== name)
    setFavorites(next); saveFavorites(next)
  }

  const title = view.contents.length === 1 ? view.contents[0] : 'Comparador analítico'
  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-6">
      <button type="button" onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-plum"><ArrowLeft className="size-4" />Volver</button>
      <header>
        <p className="text-[11px] text-muted">Seguimiento / {view.contents.length === 1 ? view.contents[0] : 'Comparador'}</p>
        <h1 className="mt-1 text-[23px] font-semibold">{title}</h1>
      </header>

      <section className={`${card} space-y-3`} aria-label="Selección">
        <div className="grid gap-3 lg:grid-cols-2">
          <MultiSelect label="Depósitos / contenidos" options={contentOptions} selected={view.contents} onChange={(contents) => patch({ contents })} placeholder="Elige uno o varios" max={40} />
          <MultiSelect label="Parámetros" options={parameterOptions} selected={view.parameters} onChange={(parameters) => patch({ parameters })} placeholder="Elige parámetros" bulk max={30} />
        </div>
        <div className="flex flex-wrap items-end gap-3 text-xs">
          <label className="grid gap-1 font-semibold text-muted">Periodo
            <select value={view.period} onChange={(event) => patch({ period: event.target.value as Period })} className={`${select} font-normal text-copy`}>{PERIODS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
          </label>
          <label className="grid gap-1 font-semibold text-muted">Eje horizontal
            <select value={view.axis} onChange={(event) => patch({ axis: event.target.value as Axis })} className={`${select} font-normal text-copy`}>
              <option value="date">Fecha</option><option value="days">Días desde el inicio (alinea fermentaciones)</option>
            </select>
          </label>
          <div className="grid gap-1 font-semibold text-muted">Vista
            <div className="flex overflow-hidden rounded-xl border border-border font-normal" role="group" aria-label="Modo de vista">
              {(['grid', 'overlay'] as Mode[]).map((option) => (
                <button key={option} type="button" aria-pressed={mode === option} onClick={() => patch({ mode: option })} className={`px-3 py-1.5 ${mode === option ? 'bg-plum-soft font-semibold text-plum' : 'bg-white text-copy'}`}>{option === 'grid' ? 'Un gráfico por parámetro' : 'Superponer'}</button>
              ))}
            </div>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button type="button" disabled={!hasPoints} onClick={() => downloadCsv(`seguimiento-${new Date().toISOString().slice(0, 10)}.csv`, seriesToCsv(data))} className="flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-1.5 font-semibold disabled:opacity-50"><Download className="size-3.5" />Exportar CSV</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
          <Toggle checked={showEvents} onChange={setShowEvents} label="Anotar trasiegos, operaciones y revisiones" />
          <Toggle checked={showTargets} onChange={setShowTargets} label="Mostrar objetivos (aviso / crítico)" />
          <Toggle checked={includeAncestors} onChange={setIncludeAncestors} label="Incluir origen (contenidos de los que procede)" />
          <Toggle checked={showRate && mode === 'grid'} disabled={mode !== 'grid'} onChange={setShowRate} label="Velocidad de cambio (Δ/día)" />
        </div>
        {view.mode === 'overlay' && distinctUnits > 2 && <p role="status" className="rounded-xl bg-[#f5eed0] p-2 text-[11.5px] text-[#6b5a10]">Superponer admite como máximo 2 unidades distintas; se muestra un gráfico por parámetro.</p>}
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs">
          <Star className="size-3.5 text-muted" aria-hidden="true" />
          {favorites.length === 0 && <span className="text-muted">Guarda una vista para recuperarla con un clic (se guarda en este navegador).</span>}
          {favorites.map((favorite) => (
            <span key={favorite.name} className="flex items-center overflow-hidden rounded-full border border-border">
              <button type="button" onClick={() => setView({ contents: favorite.contents, parameters: favorite.parameters, period: favorite.period, mode: favorite.mode, axis: favorite.axis })} className="px-3 py-1 font-semibold text-plum hover:bg-plum-soft">{favorite.name}</button>
              <button type="button" aria-label={`Borrar vista ${favorite.name}`} onClick={() => removeFavorite(favorite.name)} className="border-l border-border px-2 py-1 text-muted hover:text-[#8e1f33]"><Trash2 className="size-3" /></button>
            </span>
          ))}
          <input value={favoriteName} onChange={(event) => setFavoriteName(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveFavorite() }} placeholder="Nombre de la vista" className="ml-auto w-44 rounded-xl border border-border px-2 py-1.5" />
          <button type="button" disabled={!favoriteName.trim() || view.contents.length === 0} onClick={saveFavorite} className="rounded-xl bg-plum px-3 py-1.5 font-semibold text-white disabled:opacity-50">Guardar vista</button>
        </div>
      </section>

      {view.contents.length === 0 && <p className={`${card} text-center text-xs text-muted`}>Elige al menos un depósito o contenido para ver su evolución.</p>}
      {series.loading && view.contents.length > 0 && <LoadingState label="Cargando analíticas…" />}
      {series.error && <ErrorState message={series.error} onRetry={series.reload} />}
      {!series.loading && !series.error && view.contents.length > 0 && data.contents.length === 0 && (
        <p className={`${card} text-center text-xs text-muted`}>No hay datos accesibles para esa selección (puede que el contenido no exista o esté en otra zona).</p>
      )}

      {!series.loading && !series.error && data.contents.length > 0 && (
        <>
          {!hasPoints && <p className={`${card} text-center text-xs text-muted`}>Sin analíticas en este periodo para los parámetros elegidos. Prueba con «Campaña completa».</p>}
          {hasPoints && mode === 'overlay' && (
            <section className={card}>
              <SeriesChart series={chartSeries} axis={view.axis} events={eventList} showTargets={showTargets} showRate={false} height={420} label={`Evolución de ${data.parameters.map((parameter) => parameter.name).join(', ')}`} />
              <ChartNotes hasGaps events={eventList.length} />
            </section>
          )}
          {hasPoints && mode === 'grid' && (
            <div className="grid gap-4 lg:grid-cols-2">
              {data.parameters.map((parameter) => {
                const own = chartSeries.filter((item) => item.parameter.code === parameter.code)
                const any = own.some((item) => item.points.length > 0)
                return (
                  <section key={parameter.code} className={card}>
                    <h2 className="text-sm font-semibold">{parameter.name}<span className="ml-1 text-xs font-normal text-muted">{parameter.unit}</span></h2>
                    {any
                      ? <SeriesChart series={own} axis={view.axis} events={eventList} showTargets={showTargets} showRate={showRate} height={300} label={`Evolución de ${parameter.name}`} />
                      : <p className="py-10 text-center text-xs text-muted">Sin datos de este parámetro.</p>}
                  </section>
                )
              })}
            </div>
          )}
          {hasPoints && mode === 'grid' && <ChartNotes hasGaps events={eventList.length} />}
          {hasPoints && <LatestComparison series={data} onOpenContent={(code) => onNavigate(`contents/${encodeURIComponent(code)}`)} />}
          {hasPoints && <DateComparison series={data} />}
          {hasPoints && (
            <section className={card}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">Datos ({data.points.length})</h2>
                <button type="button" onClick={() => setShowTable((current) => !current)} className="text-xs font-semibold text-plum">{showTable ? 'Ocultar tabla' : 'Ver tabla de datos'}</button>
              </div>
              {showTable && <div className="mt-3"><DataTable series={data} onOpenSample={(code) => onNavigate(`laboratory/review/${encodeURIComponent(code)}`)} /></div>}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 ${disabled ? 'opacity-50' : ''}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="size-3.5 accent-plum" />{label}
    </label>
  )
}

function ChartNotes({ hasGaps, events }: { hasGaps: boolean; events: number }) {
  return (
    <p className="text-[11px] text-muted">
      {hasGaps && 'Los huecos son ausencia de muestreo: no se interpola. '}
      Rombo hueco = resultado con calificador («&lt; límite»). {events > 0 && `${events} evento(s) anotados: pasa el ratón por la línea punteada. `}
      Línea discontinua del mismo color = procedencia del contenido.
    </p>
  )
}
