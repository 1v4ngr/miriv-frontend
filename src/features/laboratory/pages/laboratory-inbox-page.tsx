import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CheckSquare2, ChevronDown, FlaskConical, Search, X } from 'lucide-react'
import { laboratoryApi } from '../services/laboratory-api'
import type { Sample, SampleStatus } from '../types'
import { useCan } from '../../../hooks/use-permissions'
import { useIncrementalList } from '../../../hooks/use-incremental-list'

type Tab = 'Muestras' | 'Resultados pendientes' | 'Análisis'
type Filters = { panel: string; status: string; responsible: string; dateFrom: string; dateTo: string; unvalidated: boolean }
const emptyFilters = (): Filters => ({ panel: 'Todos', status: 'Todos', responsible: 'Todos', dateFrom: '', dateTo: '', unvalidated: false })
const tabs: Tab[] = ['Muestras', 'Resultados pendientes', 'Análisis']
interface Props { search: string; onOpenContent: (code: string) => void; onCreateSample: () => void; onEnterResults: (code: string) => void; onReview: (code: string) => void; onImport: () => void }

export function LaboratoryInboxPage({ search, onOpenContent, onCreateSample, onEnterResults, onReview, onImport }: Props) {
  const canEnterResults = useCan('RESULT_ENTER')
  const canRegisterSample = useCan('SAMPLE_REGISTER')
  const canImport = useCan('RESULT_IMPORT')
  const [samples, setSamples] = useState<Sample[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('Resultados pendientes')
  const [filters, setFilters] = useState<Record<Tab, Filters>>({ Muestras: emptyFilters(), 'Resultados pendientes': emptyFilters(), Análisis: emptyFilters() })
  const [selected, setSelected] = useState<string[]>([])
  const [detail, setDetail] = useState<Sample>()
  const [upcoming, setUpcoming] = useState('')
  // The inbox needs counts and status only: one light query. A sample's results load when it is opened.
  useEffect(() => { laboratoryApi.getSampleSummaries().then(setSamples).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se han podido cargar las muestras.')).finally(() => setLoading(false)) }, [])

  const current = filters[tab]
  const setCurrent = (update: Partial<Filters>) => setFilters((previous) => ({ ...previous, [tab]: { ...previous[tab], ...update } }))
  const pending = samples.filter((sample) => ['Borrador', 'Pendiente validar', 'Análisis parcial'].includes(sample.status))
  const analyses = samples.filter((sample) => sample.status !== 'Borrador')
  const base = tab === 'Muestras' ? samples : tab === 'Análisis' ? analyses : pending
  const shown = useMemo(() => base.filter((sample) => {
    const query = search.trim().toLocaleLowerCase('es')
    return (!query || `${sample.code} ${sample.originDeposit} ${sample.contentCode} ${sample.lotCode}`.toLocaleLowerCase('es').includes(query)) && (current.panel === 'Todos' || sample.panel === current.panel) && (current.status === 'Todos' || sample.status === current.status) && (current.responsible === 'Todos' || sample.responsible === current.responsible) && (!current.dateFrom || sample.takenDate >= current.dateFrom) && (!current.dateTo || sample.takenDate <= current.dateTo) && (!current.unvalidated || !['Validado', 'Invalidado'].includes(sample.status))
  }).sort((a, b) => b.takenAt.localeCompare(a.takenAt)), [base, search, current])
  // Rows render in batches as the page scrolls (lazy), instead of all at once.
  // Samples grouped by day of taking (newest first). Today and yesterday open; older days folded, and a folded
  // day renders no rows. Days themselves appear in batches as the page scrolls.
  const days = useMemo(() => groupByDay(shown), [shown])
  const [toggled, setToggled] = useState<Set<string>>(new Set())
  const isOpen = (day: string, index: number) => toggled.has(day) ? index >= 2 : index < 2
  const toggleDay = (day: string) => setToggled((previous) => { const next = new Set(previous); if (next.has(day)) next.delete(day); else next.add(day); return next })
  const viewport = useRef<HTMLElement | null>(null)
  const { visible: visibleDays, hasMore, sentinel } = useIncrementalList(days, viewport, 12)
  const selectedSamples = samples.filter((sample) => selected.includes(sample.code))
  const compatible = selectedSamples.length > 0 && selectedSamples.every((sample) => sample.panel === selectedSamples[0].panel && sample.status !== 'Invalidado')
  const toggleSelected = (code: string) => setSelected((previous) => previous.includes(code) ? previous.filter((item) => item !== code) : [...previous, code])

  return <div className="min-w-0 space-y-4 pb-4"><header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-[23px] font-semibold">Laboratorio</h1><p className="mt-1 text-xs text-muted">{samples.length} muestras · {analyses.length} análisis · los totales no se suman entre sí</p></div><div className="flex flex-wrap gap-2">{canImport && <button onClick={onImport} className="min-h-9 rounded-xl border border-border bg-white px-3 text-xs font-semibold">Importar</button>}{canEnterResults && <button onClick={() => { const next = shown.find((sample) => sample.status !== 'Invalidado'); if (next) onEnterResults(next.code) }} className="min-h-9 rounded-xl border border-border bg-white px-3 text-xs font-semibold">Introducir resultados</button>}{canRegisterSample && <button onClick={onCreateSample} className="min-h-9 rounded-xl bg-plum px-3 text-xs font-semibold text-white">Registrar muestra</button>}</div></header>
    <div role="tablist" aria-label="Bandeja de laboratorio" className="flex gap-1 overflow-x-auto border-b border-border">{tabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => { setTab(item); setSelected([]) }} className={`shrink-0 border-b-2 px-3 py-3 text-xs font-semibold ${tab === item ? 'border-plum text-plum' : 'border-transparent text-muted'}`}>{item} <span className="ml-1 rounded-full bg-plum-soft px-1.5 py-0.5 text-[10px] text-plum">{item === 'Muestras' ? samples.length : item === 'Análisis' ? analyses.length : pending.length}</span></button>)}</div>
    <section aria-label="Filtros de laboratorio" className="flex flex-wrap gap-2 rounded-2xl border border-border bg-white p-3">{([['Panel', 'panel', ['Todos', ...new Set(samples.map((sample) => sample.panel))]], ['Estado', 'status', ['Todos', ...new Set(samples.map((sample) => sample.status))]], ['Responsable', 'responsible', ['Todos', ...new Set(samples.map((sample) => sample.responsible))]]] as [string, 'panel' | 'status' | 'responsible', string[]][]).map(([label, key, options]) => <label key={key} className="text-[11px] font-semibold text-muted">{label}<select value={current[key]} onChange={(event) => setCurrent({ [key]: event.target.value })} className="ml-2 min-h-9 rounded-lg border border-border bg-white px-2 text-xs text-ink">{options.map((option) => <option key={option}>{option}</option>)}</select></label>)}<label className="flex items-center gap-1.5 text-xs text-copy"><input type="checkbox" checked={current.unvalidated} onChange={(event) => setCurrent({ unvalidated: event.target.checked })} />Sin validar</label></section>
    <div className="flex flex-wrap gap-2 text-[11px] text-muted"><label>Desde <input type="date" value={current.dateFrom} onChange={(event) => setCurrent({ dateFrom: event.target.value })} className="ml-1 min-h-9 rounded-lg border border-border bg-white px-2" /></label><label>Hasta <input type="date" value={current.dateTo} onChange={(event) => setCurrent({ dateTo: event.target.value })} className="ml-1 min-h-9 rounded-lg border border-border bg-white px-2" /></label></div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted"><span><Search className="mr-1 inline size-3.5" />{shown.length} resultados · más recientes primero · agrupadas por día</span>{selected.length > 0 && <span>{selected.length} seleccionada(s) · {compatible ? `panel ${selectedSamples[0].panel} compatible` : 'selección no compatible'}</span>}</div>
    {loading ? <p className="rounded-2xl border border-border bg-white p-6 text-center text-xs text-muted">Cargando laboratorio…</p> : error ? <p role="alert" className="rounded-2xl border border-border bg-white p-6 text-xs text-[#8e1f33]">{error}</p> : shown.length === 0 ? <p className="rounded-2xl border border-border bg-white p-6 text-center text-xs text-muted">No hay registros con estos filtros.</p> : <><div className="hidden overflow-x-auto rounded-2xl border border-border bg-white md:block"><table className="w-full min-w-[780px] text-left text-xs"><thead className="bg-field text-[11px] text-muted"><tr><th className="px-3 py-3"><span className="sr-only">Seleccionar</span></th>{['Muestra', 'Origen', 'Toma', 'Panel', 'Parámetros', 'Validación'].map((label) => <th key={label} className="px-3 py-3">{label}</th>)}</tr></thead>{visibleDays.map((day, index) => { const open = isOpen(day.date, index); return <tbody key={day.date}><tr className="border-t border-border bg-[#fdfbfc]"><td colSpan={7} className="p-0"><DayHeader day={day} open={open} onToggle={() => toggleDay(day.date)} /></td></tr>{open && day.samples.map((sample) => <tr key={sample.code} className="border-t border-border"><td className="px-3 py-3"><input type="checkbox" aria-label={`Seleccionar ${sample.code}`} checked={selected.includes(sample.code)} onChange={() => toggleSelected(sample.code)} /></td><td className="px-3 py-3"><button onClick={() => setDetail(sample)} className="font-mono font-semibold text-plum hover:underline">{sample.code}</button>{sample.overdue && <span className="ml-2 rounded-full bg-[#f5e4da] px-1.5 py-0.5 text-[10px] text-[#7a4a22]">Control vencido</span>}</td><td className="px-3 py-3"><span>{sample.originDeposit}{sample.originDeposit !== sample.currentDeposit && ` → ${sample.currentDeposit}`}</span><p className="mt-1 font-mono text-[10px] text-muted">{sample.contentCode} · {sample.lotCode}</p></td><td className="px-3 py-3">{sample.takenAt}<p className="mt-1 text-[10px] text-muted">{sample.age}</p></td><td className="px-3 py-3">{sample.panel}</td><td className="px-3 py-3">{sample.completed} de {sample.required}<p className="mt-1 text-[10px] text-muted">{sample.required - sample.completed ? `faltan ${sample.required - sample.completed}` : 'completo'}</p></td><td className="px-3 py-3"><Status status={sample.status} /></td></tr>)}</tbody> })}</table></div><div className="space-y-3 md:hidden">{visibleDays.map((day, index) => { const open = isOpen(day.date, index); return <section key={day.date} className="overflow-hidden rounded-2xl border border-border bg-white"><DayHeader day={day} open={open} onToggle={() => toggleDay(day.date)} />{open && <div className="space-y-2 border-t border-border bg-[#fdfbfc] p-2">{day.samples.map((sample) => <div key={sample.code} className="rounded-2xl border border-border bg-white p-4"><div className="flex items-start justify-between gap-2"><button onClick={() => setDetail(sample)} className="font-mono text-sm font-semibold text-plum">{sample.code}</button><Status status={sample.status} /></div>{sample.overdue && <p className="mt-1 text-[11px] font-semibold text-[#8e1f33]">Control vencido</p>}<p className="mt-2 text-xs">{sample.originDeposit}{sample.originDeposit !== sample.currentDeposit && ` → ${sample.currentDeposit}`} · {sample.contentCode}</p><p className="mt-1 text-[11px] text-muted">Toma {sample.takenAt} · {sample.age}</p><div className="mt-3 flex items-center justify-between"><span className="text-xs">{sample.completed}/{sample.required} parámetros</span><button onClick={() => setDetail(sample)} className="text-xs font-semibold text-plum">{sample.completed < sample.required ? 'Continuar carga' : 'Abrir análisis'} <ArrowRight className="inline size-3" /></button></div></div>)}</div>}</section> })}</div><div ref={sentinel} aria-hidden="true" className="h-px" />{hasMore && <p className="py-3 text-center text-[11px] text-muted" role="status">Cargando más días…</p>}</>}
    {compatible && <div className="sticky bottom-16 z-10 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-white p-3 shadow-lg lg:bottom-3"><span className="text-xs">{selected.length} muestra(s) · panel {selectedSamples[0].panel}</span><button onClick={() => setUpcoming('UI10 · Entrada conjunta de resultados')} className="flex min-h-9 items-center gap-1 rounded-xl bg-plum px-3 text-xs font-semibold text-white"><CheckSquare2 className="size-4" />Continuar carga</button></div>}
    {detail && <SampleDrawerLoader key={detail.code} summary={detail} onClose={() => setDetail(undefined)} onOpenContent={onOpenContent} onEnterResults={onEnterResults} onReview={onReview} />}
    {upcoming && <div className="fixed inset-0 z-40 grid place-items-center bg-[#2e262a]/30 p-4" onMouseDown={() => setUpcoming('')}><section role="dialog" aria-modal="true" aria-label="Vista pendiente" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"><div className="flex justify-between gap-2"><h2 className="text-sm font-semibold">{upcoming}</h2><button onClick={() => setUpcoming('')} aria-label="Cerrar"><X className="size-4" /></button></div><p className="mt-2 text-xs text-muted">Esta acción pertenece a una vista posterior. La bandeja mantiene la selección y los filtros.</p><button onClick={() => setUpcoming('')} className="mt-4 min-h-9 rounded-xl bg-plum px-4 text-xs font-semibold text-white">Entendido</button></section></div>}
  </div>
}

function Status({ status }: { status: SampleStatus }) { return <span className={`inline-block rounded-full px-2 py-1 text-[10px] font-semibold ${status === 'Validado' ? 'bg-[#dceadf] text-[#1f5c3a]' : status === 'Invalidado' ? 'bg-[#efeff5] text-[#43435c]' : status === 'Borrador' ? 'bg-[#f5e4da] text-[#7a4a22]' : 'bg-plum-soft text-plum'}`}>{status}</span> }

/** Opens with the summary at once and loads the sample's results and history in the background (lazy). */
function SampleDrawerLoader({ summary, ...props }: { summary: Sample; onClose: () => void; onOpenContent: (code: string) => void; onEnterResults: (code: string) => void; onReview: (code: string) => void }) {
  const [full, setFull] = useState<Sample>()
  useEffect(() => { let active = true; laboratoryApi.getSample(summary.code).then((sample) => { if (active && sample) setFull(sample) }).catch(() => undefined); return () => { active = false } }, [summary.code])
  return <SampleDrawer sample={full ?? summary} loadingResults={!full} {...props} />
}

function SampleDrawer({ sample, loadingResults = false, onClose, onOpenContent, onEnterResults, onReview }: { sample: Sample; loadingResults?: boolean; onClose: () => void; onOpenContent: (code: string) => void; onEnterResults: (code: string) => void; onReview: (code: string) => void }) {
  return <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-labelledby="sample-title" onMouseDown={(event) => event.stopPropagation()} className="h-full w-full max-w-[440px] overflow-y-auto bg-[#fdfbfc] p-5 shadow-xl"><div className="flex justify-between"><div><p className="font-mono text-[10px] text-muted">MUESTRA · {sample.panel}</p><h2 id="sample-title" className="mt-1 font-mono text-lg font-semibold">{sample.code}</h2></div><button onClick={onClose} aria-label="Cerrar"><X className="size-4" /></button></div><div className="mt-3"><Status status={sample.status} /></div><dl className="mt-4 space-y-3 rounded-xl border border-border bg-white p-4 text-xs">{[['Depósito de origen', sample.originDeposit], ['Ubicación actual', sample.currentDeposit], ['Contenido', sample.contentCode], ['Lote', sample.lotCode], ['Fecha de toma', sample.takenAt], ['Responsable', sample.responsible], ['Parámetros', `${sample.completed} de ${sample.required}`]].map(([label, value]) => <div key={label} className="flex justify-between gap-3"><dt className="text-muted">{label}</dt><dd className="text-right font-semibold">{value}</dd></div>)}</dl>{sample.originDeposit !== sample.currentDeposit && <p className="mt-3 rounded-xl bg-[#f5e4da] p-3 text-xs text-[#7a4a22]">El depósito de toma no coincide con la ubicación actual. La muestra conserva su origen.</p>}<h3 className="mt-5 text-sm font-semibold">Resultados destacados</h3>{loadingResults ? <p className="mt-2 text-xs text-muted">Cargando resultados…</p> : sample.results.length ? sample.results.map((result) => <div key={result.parameter} className="mt-2 flex justify-between gap-3 rounded-xl border border-border bg-white p-3 text-xs"><span>{result.parameter}</span><span className="text-right font-semibold">{result.value} {result.unit}<small className="block font-normal text-muted">{result.validity}</small></span></div>) : <p className="mt-2 text-xs text-muted">Sin resultados destacados.</p>}<div className="mt-5 flex flex-wrap gap-2"><button onClick={() => onOpenContent(sample.contentCode)} className="flex min-h-9 items-center gap-1 rounded-xl border border-border px-3 text-xs font-semibold"><FlaskConical className="size-4" />Ver contenido</button><button onClick={() => { onClose(); sample.completed < sample.required ? onEnterResults(sample.code) : onReview(sample.code) }} className="min-h-9 rounded-xl bg-plum px-3 text-xs font-semibold text-white">{sample.completed < sample.required ? 'Continuar carga' : 'Abrir análisis'}</button></div></section></div>
}

interface SampleDay { date: string; samples: Sample[]; pending: number }

/** Samples (already newest first) grouped by the day they were taken. */
function groupByDay(samples: Sample[]): SampleDay[] {
  const days = new Map<string, Sample[]>()
  for (const sample of samples) days.set(sample.takenDate, [...(days.get(sample.takenDate) ?? []), sample])
  return [...days.entries()].map(([date, items]) => ({ date, samples: items, pending: items.filter((item) => item.status !== 'Validado' && item.status !== 'Invalidado').length }))
}

const DAY_FORMAT = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })
function dayLabel(date: string) {
  const day = new Date(`${date}T12:00:00`)
  const today = new Date()
  const diff = Math.round((new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).getTime() - day.getTime()) / 86_400_000)
  const text = DAY_FORMAT.format(day)
  return diff === 0 ? `Hoy · ${text}` : diff === 1 ? `Ayer · ${text}` : text.charAt(0).toUpperCase() + text.slice(1)
}

function DayHeader({ day, open, onToggle }: { day: SampleDay; open: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-plum-soft/40">
      <ChevronDown className={`size-4 shrink-0 text-muted transition-transform duration-200 ${open ? '' : '-rotate-90'}`} aria-hidden="true" />
      <span className="text-[12.5px] font-semibold text-ink">{dayLabel(day.date)}</span>
      <span className="font-mono text-[11px] text-muted">{day.samples.length} muestra{day.samples.length === 1 ? '' : 's'}</span>
      {day.pending > 0 && <span className="ml-auto rounded-full bg-plum-soft px-2 py-0.5 text-[10.5px] font-semibold text-plum">{day.pending} sin validar</span>}
    </button>
  )
}
