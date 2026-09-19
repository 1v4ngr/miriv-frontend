import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowDown, ArrowUp, GitCompare, Minus } from 'lucide-react'
import { useResource } from '../../../hooks/use-resource'
import { formatLiters, formatRelative } from '../../../lib/format'
import { fermentationLabels } from '../../../lib/labels'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/page-state'
import { MultiSelect } from '../components/multi-select'
import { trackingApi, type OverviewRow } from '../services/tracking-api'
import { STALE_DAYS, formatAge, formatReading, statusClass, statusLabel } from '../utils'

interface Props {
  onOpenCurves: (contentCode: string) => void
  onCompare: (contentCodes: string[], parameterCodes: string[]) => void
}

type Quick = 'all' | 'crit' | 'warn' | 'stale' | 'open'

const th = 'whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold text-muted'
const field = 'rounded-xl border border-border bg-white px-2 py-1.5 text-xs'

/** Cellar-wide status matrix: one row per occupied tank, latest key parameters coloured against their targets. */
export function TrackingListPage({ onOpenCurves, onCompare }: Props) {
  const [chosen, setChosen] = useState<string[]>([])
  const [quick, setQuick] = useState<Quick>('all')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [zone, setZone] = useState('')
  const [state, setState] = useState('')
  const [selected, setSelected] = useState<string[]>([])

  const overview = useResource(() => trackingApi.overview(chosen.length ? chosen : undefined), [chosen.join(',')])
  const parameterList = useResource(() => trackingApi.parameters(), [])
  const rows = overview.data?.rows ?? []
  const parameters = overview.data?.parameters ?? []
  const shownParameters = chosen.length ? chosen : parameters.map((parameter) => parameter.code)

  const stale = (row: OverviewRow) => row.daysSinceLastSample === null || row.daysSinceLastSample > STALE_DAYS
  const counts = useMemo(() => ({
    crit: rows.filter((row) => row.worstStatus === 'CRIT').length,
    warn: rows.filter((row) => row.worstStatus === 'WARN').length,
    stale: rows.filter((row) => row.daysSinceLastSample === null || row.daysSinceLastSample > STALE_DAYS).length,
    open: rows.filter((row) => row.openSamples > 0 || row.openTasks > 0).length,
  }), [rows])

  const categories = [...new Set(rows.map((row) => row.category).filter((value): value is string => !!value))].sort()
  const zones = [...new Set(rows.map((row) => row.zone).filter((value): value is string => !!value))].sort()
  const states = [...new Set(rows.map((row) => row.alcoholicState).filter((value): value is string => !!value))].sort()

  const visible = rows.filter((row) => {
    const text = `${row.deposit} ${row.depositName ?? ''} ${row.content} ${row.lot}`.toLowerCase()
    if (search.trim() && !text.includes(search.trim().toLowerCase())) return false
    if (category && row.category !== category) return false
    if (zone && row.zone !== zone) return false
    if (state && row.alcoholicState !== state) return false
    if (quick === 'crit') return row.worstStatus === 'CRIT'
    if (quick === 'warn') return row.worstStatus === 'WARN' || row.worstStatus === 'CRIT'
    if (quick === 'stale') return stale(row)
    if (quick === 'open') return row.openSamples > 0 || row.openTasks > 0
    return true
  })
  const allSelected = visible.length > 0 && visible.every((row) => selected.includes(row.content))
  const toggle = (code: string) => setSelected((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]))

  return (
    <div className="space-y-4 pb-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] text-muted">Seguimiento</p>
          <h1 className="mt-1 text-[23px] font-semibold">Estado de la bodega</h1>
          <p className="mt-1 text-xs text-muted">Cada depósito ocupado con su última analítica. Ordenado de más a menos preocupante; el color compara con los objetivos configurados.</p>
        </div>
        <button type="button" disabled={selected.length === 0} onClick={() => onCompare(selected, shownParameters)} className="flex items-center gap-2 rounded-xl bg-plum px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
          <GitCompare className="size-4" aria-hidden="true" />Comparar{selected.length > 0 ? ` (${selected.length})` : ''}
        </button>
      </header>

      {overview.loading && <LoadingState label="Cargando estado de la bodega…" />}
      {overview.error && <ErrorState message={overview.error} onRetry={overview.reload} />}

      {!overview.loading && !overview.error && (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros rápidos">
            <Chip active={quick === 'all'} onClick={() => setQuick('all')} label={`Todos (${rows.length})`} />
            <Chip active={quick === 'crit'} onClick={() => setQuick('crit')} label={`Críticos (${counts.crit})`} tone="CRIT" />
            <Chip active={quick === 'warn'} onClick={() => setQuick('warn')} label={`Con aviso o crítico (${counts.warn + counts.crit})`} tone="WARN" />
            <Chip active={quick === 'stale'} onClick={() => setQuick('stale')} label={`Sin analizar > ${STALE_DAYS} d (${counts.stale})`} />
            <Chip active={quick === 'open'} onClick={() => setQuick('open')} label={`Con trabajo pendiente (${counts.open})`} />
          </div>

          <section className="grid gap-3 rounded-2xl border border-border bg-white p-4 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
            <MultiSelect label="Parámetros en la matriz" options={(parameterList.data ?? []).map((parameter) => ({ value: parameter.code, label: parameter.name, hint: parameter.unit ?? undefined }))} selected={shownParameters} onChange={setChosen} bulk max={12} />
            <label className="grid gap-1 text-[11px] font-semibold text-muted">Buscar
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Depósito, contenido o lote" className={`${field} font-normal text-copy`} />
            </label>
            <label className="grid gap-1 text-[11px] font-semibold text-muted">Categoría
              <select value={category} onChange={(event) => setCategory(event.target.value)} className={`${field} font-normal text-copy`}><option value="">Todas</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-1 text-[11px] font-semibold text-muted">Zona
                <select value={zone} onChange={(event) => setZone(event.target.value)} className={`${field} font-normal text-copy`}><option value="">Todas</option>{zones.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <label className="grid gap-1 text-[11px] font-semibold text-muted">Fermentación
                <select value={state} onChange={(event) => setState(event.target.value)} className={`${field} font-normal text-copy`}><option value="">Todas</option>{states.map((item) => <option key={item} value={item}>{fermentationLabels[item] ?? item}</option>)}</select>
              </label>
            </div>
          </section>

          {rows.length === 0 && <EmptyState label="No hay depósitos ocupados en seguimiento." />}
          {rows.length > 0 && visible.length === 0 && <EmptyState label="Ningún depósito cumple los filtros." />}
          {visible.length > 0 && (
            <div className="overflow-x-auto rounded-2xl border border-border bg-white">
              <table className="w-full min-w-[860px] border-collapse">
                <thead>
                  <tr className="border-b border-border bg-[#fbf7f9]">
                    <th className={th}><input type="checkbox" aria-label="Seleccionar todos los visibles" checked={allSelected} onChange={() => setSelected(allSelected ? [] : visible.map((row) => row.content))} className="size-3.5 accent-plum" /></th>
                    <th className={`${th} sticky left-0 bg-[#fbf7f9]`}>Depósito</th>
                    <th className={th}>Fermentación</th>
                    {parameters.map((parameter) => <th key={parameter.code} className={th}>{parameter.name}<div className="font-normal">{parameter.unit}</div></th>)}
                    <th className={th}>Pendiente</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((row) => (
                    <tr key={row.content} className="border-b border-border last:border-0 hover:bg-[#fdfafb]">
                      <td className="px-3 py-2"><input type="checkbox" aria-label={`Seleccionar ${row.deposit}`} checked={selected.includes(row.content)} onChange={() => toggle(row.content)} className="size-3.5 accent-plum" /></td>
                      <td className="sticky left-0 bg-white px-3 py-2">
                        <button type="button" onClick={() => onOpenCurves(row.content)} className="text-left">
                          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-plum hover:underline">{row.deposit}{row.worstStatus === 'CRIT' && <AlertTriangle className="size-3.5 text-[#b3263f]" aria-label="Crítico" />}</span>
                          <span className="block font-mono text-[11px] text-copy">{row.content}</span>
                          <span className="block text-[10.5px] text-muted">{[row.category, `${formatLiters(row.volumeLiters ?? 0)} L`, row.zone].filter(Boolean).join(' · ')}</span>
                        </button>
                      </td>
                      <td className="px-3 py-2 text-xs">{row.alcoholicState ? fermentationLabels[row.alcoholicState] ?? row.alcoholicState : '—'}</td>
                      {row.cells.map((cell, index) => {
                        const parameter = parameters[index]
                        const latest = cell.latest
                        if (!latest) return <td key={cell.parameter} className="px-3 py-2 text-xs text-muted">—</td>
                        const old = latest.daysAgo > STALE_DAYS
                        return (
                          <td key={cell.parameter} className={`px-3 py-2 ${old ? 'opacity-60' : ''}`}>
                            <div className="flex items-center gap-1" title={`${statusLabel[latest.status]} · ${formatAge(latest.daysAgo)}${old ? ' (desfasado)' : ''}`}>
                              <span className={`rounded-md px-2 py-0.5 font-mono text-xs font-semibold ${statusClass[latest.status]}`}>{formatReading(latest.value, latest.qualifier, latest.limit, parameter?.decimals ?? 2)}</span>
                              <Trend trend={cell.trend} previous={cell.previous ? formatReading(cell.previous.value, cell.previous.qualifier, cell.previous.limit, parameter?.decimals ?? 2) : undefined} />
                            </div>
                            <div className={`mt-0.5 text-[10.5px] ${old ? 'font-semibold text-[#8e6a10]' : 'text-muted'}`}>{formatAge(latest.daysAgo)}</div>
                          </td>
                        )
                      })}
                      <td className="px-3 py-2 text-[11px] text-muted">
                        {row.daysSinceLastSample === null || row.daysSinceLastSample > STALE_DAYS
                          ? <div className="font-semibold text-[#8e6a10]">{row.daysSinceLastSample === null ? 'Nunca muestreado' : `Sin muestra ${formatAge(row.daysSinceLastSample)}`}</div>
                          : null}
                        {row.openSamples > 0 && <div>{row.openSamples} muestra(s) abierta(s)</div>}
                        {row.openTasks > 0 && <div>{row.openTasks} tarea(s){row.nextTaskDueAt ? ` · ${formatRelative(row.nextTaskDueAt)}` : ''}</div>}
                        {row.openSamples === 0 && row.openTasks === 0 && row.daysSinceLastSample !== null && row.daysSinceLastSample <= STALE_DAYS && '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Legend />
        </>
      )}
    </div>
  )
}

function Chip({ active, onClick, label, tone }: { active: boolean; onClick: () => void; label: string; tone?: 'CRIT' | 'WARN' }) {
  const toneClass = tone === 'CRIT' ? 'border-[#e5b3bd] text-[#8e1f33]' : tone === 'WARN' ? 'border-[#e3d08a] text-[#6b5a10]' : 'border-border text-copy'
  return <button type="button" aria-pressed={active} onClick={onClick} className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? 'bg-plum text-white border-plum' : `bg-white ${toneClass}`}`}>{label}</button>
}

function Trend({ trend, previous }: { trend: 'UP' | 'DOWN' | 'FLAT' | null; previous?: string }) {
  if (!trend) return null
  const title = previous ? `Antes: ${previous}` : undefined
  if (trend === 'UP') return <ArrowUp className="size-3.5 text-muted" aria-label="Sube" >{title && <title>{title}</title>}</ArrowUp>
  if (trend === 'DOWN') return <ArrowDown className="size-3.5 text-muted" aria-label="Baja">{title && <title>{title}</title>}</ArrowDown>
  return <Minus className="size-3.5 text-muted" aria-label="Estable">{title && <title>{title}</title>}</Minus>
}

function Legend() {
  return (
    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
      {(['OK', 'WARN', 'CRIT', 'UNKNOWN'] as const).map((status) => <span key={status} className="flex items-center gap-1.5"><span className={`inline-block h-3 w-5 rounded ${statusClass[status]}`} />{statusLabel[status]}</span>)}
      <span>Sin color: parámetro sin objetivo. Valores atenuados: muestra de hace más de {STALE_DAYS} días. Las flechas comparan con el análisis anterior.</span>
    </p>
  )
}
