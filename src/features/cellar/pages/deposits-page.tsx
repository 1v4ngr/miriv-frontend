import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, CalendarClock, ChevronDown, LayoutGrid, List, Plus, SlidersHorizontal, X } from 'lucide-react'
import { DepositCard } from '../components/deposit-card'
import { ContentBadge, LocationBadge, LocationIcon, PhaseBadge, contentDotClass, locationKey, locationOrder } from '../components/deposit-badges'
import { reportsApi, type ReportPhase } from '../../reports/services/reports-api'
import { useAssistantView } from '../../assistant/view-context'
import { depositsListView } from '../assistant-views'
import { LastAnalysis, analysisFilterLabels, analysisFilterText, lastSampleOf, matchesAnalysis, type AnalysisFilter, type AnalysisRange } from '../last-analysis'
import { cellarApi } from '../services/cellar-api'
import type { Deposit, NewDeposit } from '../types'
import { activeOccupation, formatLiters, statusClass, statusLabel } from '../utils'
import { useCurrentProfile } from '../../../hooks/use-current-profile'
import { useFitHeight } from '../../../hooks/use-fit-height'
import { useIncrementalList } from '../../../hooks/use-incremental-list'

interface DepositsPageProps {
  search: string
  onOpenDeposit: (code: string) => void
}

const initialForm: NewDeposit = { code: '', center: '', zone: '', position: '', capacityLiters: 0, material: 'Inox', refrigerated: false }

function DepositForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const profile = useCurrentProfile()
  const [form, setForm] = useState<NewDeposit>(initialForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile) return
    setForm((current) => ({ ...current, center: profile.centerName, zone: current.zone || profile.zones[0] || '' }))
  }, [profile])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try { await cellarApi.createDeposit(form); onCreated() } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido crear el depósito.') } finally { setSaving(false) }
  }

  return <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-labelledby="deposit-form-title" onMouseDown={(event) => event.stopPropagation()} className="h-full w-full max-w-[440px] overflow-y-auto bg-[#fdfbfc] p-5 shadow-xl sm:p-6"><div className="flex items-center justify-between"><h2 id="deposit-form-title" className="text-[20px] font-semibold">Nuevo depósito</h2><button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-plum-soft"><X className="size-4" /></button></div><p className="mt-2 text-[12px] text-muted">El alta crea un recipiente vacío. La entrada de producto se registra por separado.</p><form onSubmit={handleSubmit} className="mt-5 space-y-4"><label className="block text-[12px] font-semibold text-copy">Código *<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[#e0d2d9] bg-white px-3 text-[13px] font-normal outline-none focus:border-[#b9899c]" /></label><label className="block text-[12px] font-semibold text-copy">Centro *<input readOnly value={form.center} className="mt-1.5 h-10 w-full rounded-xl border border-[#e0d2d9] bg-field px-3 text-[13px] font-normal text-copy" /></label><label className="block text-[12px] font-semibold text-copy">Zona *<select required value={form.zone} onChange={(event) => setForm({ ...form, zone: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[#e0d2d9] bg-white px-3 text-[13px] font-normal">{profile?.zones.map((zone) => <option key={zone}>{zone}</option>)}</select></label><label className="block text-[12px] font-semibold text-copy">Posición<input value={form.position} onChange={(event) => setForm({ ...form, position: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[#e0d2d9] bg-white px-3 text-[13px] font-normal outline-none focus:border-[#b9899c]" /></label><label className="block text-[12px] font-semibold text-copy">Capacidad útil (L) *<input required type="number" min="1" value={form.capacityLiters || ''} onChange={(event) => setForm({ ...form, capacityLiters: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded-xl border border-[#e0d2d9] bg-white px-3 text-[13px] font-normal outline-none focus:border-[#b9899c]" /></label><label className="block text-[12px] font-semibold text-copy">Material<select value={form.material} onChange={(event) => setForm({ ...form, material: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-[#e0d2d9] bg-white px-3 text-[13px] font-normal"><option>Inox</option><option>Hormigón</option><option>Madera</option></select></label><label className="flex items-center gap-2 text-[12px] text-copy"><input type="checkbox" checked={form.refrigerated} onChange={(event) => setForm({ ...form, refrigerated: event.target.checked })} />Refrigerado</label>{error && <p role="alert" className="text-[12px] text-[#8e3b4a]">{error}</p>}<button type="submit" disabled={saving || !profile} className="min-h-10 w-full rounded-xl bg-plum px-4 text-[12.5px] font-semibold text-white hover:bg-plum-dark disabled:opacity-60">{saving ? 'Guardando…' : 'Crear depósito'}</button></form></section></div>
}

type SortKey = 'code' | 'zone' | 'content' | 'fill' | 'phases' | 'analysis' | 'status'
type SortDir = 'asc' | 'desc'
interface Sort { key: SortKey; dir: SortDir }

const defaultSort: Sort = { key: 'code', dir: 'asc' }

const EMPTY = '__empty__'
const ALL = ''

const statusOptions: [string, string][] = [['occupied', 'Ocupado'], ['available', 'Disponible'], ['pending_cleaning', 'Pendiente de limpieza'], ['cleaning', 'En limpieza'], ['maintenance', 'Mantenimiento']]
const priorityOptions: [string, string][] = [['critical', 'Crítica'], ['overdue', 'Control vencido'], ['high', 'Alta'], ['none', 'Sin prioridad']]

// Lower rank sorts first in ascending order: the most urgent deposits lead, empty and clean ones trail.
const priorityRank: Record<string, number> = { critical: 0, overdue: 1, high: 2 }
const statusRank: Record<string, number> = { occupied: 3, pending_cleaning: 4, cleaning: 5, maintenance: 6, available: 7 }
const rankOf = (deposit: Deposit) => priorityRank[deposit.priority] ?? statusRank[deposit.status] ?? 9

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })
const fillOf = (deposit: Deposit) => (activeOccupation(deposit)?.volumeLiters ?? 0) / (deposit.capacityLiters || 1)

function analysisRank(deposit: Deposit) {
  const last = lastSampleOf(deposit)
  return last === undefined ? Number.MAX_SAFE_INTEGER : last === null ? Number.MIN_SAFE_INTEGER : new Date(last).getTime()
}

function compareBy(key: SortKey, a: Deposit, b: Deposit, phaseOf: (deposit: Deposit) => ReportPhase | null | undefined): number {
  const occA = activeOccupation(a)
  const occB = activeOccupation(b)
  switch (key) {
    case 'code': return collator.compare(a.code, b.code)
    case 'zone': return collator.compare(a.zone ?? '￿', b.zone ?? '￿') || collator.compare(a.position ?? '', b.position ?? '')
    // Empty deposits always go after the occupied ones in ascending order.
    case 'content': return collator.compare(occA ? occA.category ?? '' : '￿', occB ? occB.category ?? '' : '￿') || collator.compare(occA?.lotCode ?? '', occB?.lotCode ?? '')
    case 'fill': return fillOf(a) - fillOf(b) || (occA?.volumeLiters ?? 0) - (occB?.volumeLiters ?? 0)
    // Phases in their configured order; deposits without a phase (or empty) last.
    case 'phases': return (phaseOf(a)?.position ?? 9_999) - (phaseOf(b)?.position ?? 9_999)
    // Oldest analysis first in ascending order (never analysed before anything); empty deposits always last.
    case 'analysis': return analysisRank(a) - analysisRank(b)
    case 'status': return rankOf(a) - rankOf(b)
  }
}

const sortLabels: Record<SortKey, string> = { code: 'Depósito', zone: 'Localización', content: 'Contenido', fill: 'Llenado', phases: 'Fase', analysis: 'Último análisis', status: 'Estado' }

function SortHeader({ label, sortKey, sort, onSort, className = '' }: { label: string; sortKey: SortKey; sort: Sort; onSort: (key: SortKey) => void; className?: string }) {
  const active = sort.key === sortKey
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return <th scope="col" aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={`px-3 py-2 ${className}`}><button type="button" onClick={() => onSort(sortKey)} className={`-mx-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-plum-soft hover:text-plum ${active ? 'text-plum' : ''}`}>{label}<Icon className={`size-3 ${active ? '' : 'opacity-40'}`} aria-hidden="true" /></button></th>
}

function Chip({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return <button type="button" aria-pressed={active} onClick={onClick} className={`inline-flex min-h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11.5px] font-medium transition ${active ? 'border-plum bg-plum-soft text-plum' : 'border-border bg-white text-copy hover:border-[#b9899c]'}`}>{children}{count !== undefined && <span className={`font-mono text-[10px] ${active ? 'text-plum/70' : 'text-muted'}`}>{count}</span>}</button>
}

function FilterSection({ label, children }: { label: string; children: ReactNode }) {
  return <div role="group" aria-label={label}><p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wide text-muted">{label}</p><div className="flex flex-wrap gap-1.5">{children}</div></div>
}

interface FilterPill { key: string; label: string; icon?: ReactNode; clear: () => void }

const labelClass = 'flex flex-col gap-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted'
const selectClass = 'min-h-8 w-full rounded-lg border border-border bg-white px-2 text-[11.5px] font-medium normal-case tracking-normal text-ink'

export function DepositsPage({ search, onOpenDeposit }: DepositsPageProps) {
  const profile = useCurrentProfile()
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [zone, setZone] = useState(ALL)
  const [content, setContent] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [priority, setPriority] = useState(ALL)
  const [material, setMaterial] = useState(ALL)
  const [refrigerated, setRefrigerated] = useState(ALL)
  const [phase, setPhase] = useState(ALL)
  const [analysis, setAnalysis] = useState<AnalysisFilter>('')
  const [analysisRange, setAnalysisRange] = useState<AnalysisRange>({ from: '', to: '' })
  // Current phase per deposit, as the deposit detail shows it (same rule, manual phases included).
  const [phases, setPhases] = useState<ReportPhase[]>([])
  const [phaseByDeposit, setPhaseByDeposit] = useState<Map<string, ReportPhase | null>>()
  const [sort, setSort] = useState<Sort>(defaultSort)
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const loadDeposits = () => { setLoading(true); cellarApi.getDeposits().then(setDeposits).catch((cause) => setError(cause instanceof Error ? cause.message : 'Error al cargar depósitos.')).finally(() => setLoading(false)) }
  useEffect(loadDeposits, [])
  useEffect(() => {
    reportsApi.options().then((options) => {
      const active = options.phases.filter((item) => item.active)
      setPhases(active)
      setPhaseByDeposit(new Map(options.deposits.map((item) => [item.code, active.find((candidate) => candidate.code === item.phase) ?? null])))
    }).catch(() => setPhaseByDeposit(new Map()))
  }, [deposits])
  const phaseOf = (deposit: Deposit) => phaseByDeposit?.get(deposit.code)

  // Locations offered: the center's zones (so a new one like Suelo shows up before it holds a deposit)
  // plus any zone already used by a deposit. Exterior, Interior, Suelo first; the rest alphabetically.
  const zones = useMemo(() => {
    const names = new Set<string>([...(profile?.zones ?? []), ...deposits.map((item) => item.zone).filter((z): z is string => Boolean(z))])
    const order = (name: string) => { const index = locationOrder.indexOf(locationKey(name)); return index === -1 ? locationOrder.length : index }
    return Array.from(names).sort((a, b) => order(a) - order(b) || collator.compare(a, b))
  }, [deposits, profile])
  const categories = useMemo(() => Array.from(new Set(deposits.map((item) => activeOccupation(item)?.category).filter((c): c is string => Boolean(c)))).sort(collator.compare), [deposits])
  const materials = useMemo(() => Array.from(new Set(deposits.map((item) => item.material).filter(Boolean))).sort(collator.compare), [deposits])
  const countBy = (predicate: (deposit: Deposit) => boolean) => deposits.filter(predicate).length

  const filtered = useMemo(() => {
    const term = search.toLocaleUpperCase('es').replace(/\s+/g, '')
    const rows = deposits.filter((deposit) => {
      const occupation = activeOccupation(deposit)
      if (term && !`${deposit.code}${occupation?.lotCode ?? ''}${occupation?.category ?? ''}${deposit.zone ?? ''}`.toLocaleUpperCase('es').replace(/\s+/g, '').includes(term)) return false
      if (zone && deposit.zone !== zone) return false
      if (content === EMPTY ? Boolean(occupation) : content && occupation?.category !== content) return false
      if (status && deposit.status !== status) return false
      if (priority && deposit.priority !== priority) return false
      if (material && deposit.material !== material) return false
      if (refrigerated && String(deposit.refrigerated) !== refrigerated) return false
      if (phase && (phaseOf(deposit)?.code ?? '') !== phase) return false
      if (!matchesAnalysis(deposit, analysis, analysisRange)) return false
      return true
    })
    const factor = sort.dir === 'asc' ? 1 : -1
    // Ties fall back to the deposit code so the order is stable and predictable.
    return rows.sort((a, b) => factor * compareBy(sort.key, a, b, phaseOf) || collator.compare(a.code, b.code))
  }, [deposits, search, zone, content, status, priority, material, refrigerated, phase, phaseByDeposit, analysis, analysisRange, sort])

  // Header click cycles ascending → descending → back to the default order (Depósito A→Z).
  // On the Depósito column itself it just flips between A→Z and Z→A.
  const toggleSort = (key: SortKey) => setSort((current) => current.key !== key ? { key, dir: 'asc' } : current.dir === 'asc' ? { key, dir: 'desc' } : key === 'code' ? { key, dir: 'asc' } : defaultSort)
  const activeFilters = [zone, content, status, priority, material, refrigerated, phase, analysis].filter(Boolean).length
  // One page: the list scrolls inside a box that ends at the bottom of the window, and rows are
  // rendered in batches as you scroll instead of being paginated.
  const { ref: listRef, element: listElement, height: listHeight } = useFitHeight<HTMLDivElement>()
  const { visible: shown, hasMore, sentinel } = useIncrementalList(filtered, listElement)
  const resetFilters = () => { setZone(ALL); setContent(ALL); setStatus(ALL); setPriority(ALL); setMaterial(ALL); setRefrigerated(ALL); setPhase(ALL); setAnalysis(''); setAnalysisRange({ from: '', to: '' }) }
  // Active filters stay visible outside the panel as removable pills; the panel itself stays closed.
  const activePills = ([
    zone && { key: 'zone', label: zone, icon: <LocationIcon zone={zone} />, clear: () => setZone(ALL) },
    content && { key: 'content', label: content === EMPTY ? 'Vacío' : content, icon: <span className={`size-2 rounded-full ${contentDotClass(content === EMPTY ? null : content)}`} aria-hidden="true" />, clear: () => setContent(ALL) },
    status && { key: 'status', label: statusOptions.find(([value]) => value === status)?.[1] ?? status, clear: () => setStatus(ALL) },
    priority && { key: 'priority', label: priorityOptions.find(([value]) => value === priority)?.[1] ?? priority, clear: () => setPriority(ALL) },
    material && { key: 'material', label: material, clear: () => setMaterial(ALL) },
    analysis && { key: 'analysis', label: analysisFilterText(analysis, analysisRange), icon: <CalendarClock className="size-3.5 text-muted" aria-hidden="true" />, clear: () => { setAnalysis(''); setAnalysisRange({ from: '', to: '' }) } },
    phase && { key: 'phase', label: phases.find((item) => item.code === phase)?.name ?? phase, icon: <span className="size-2 rounded-full" style={{ background: phases.find((item) => item.code === phase)?.color }} aria-hidden="true" />, clear: () => setPhase(ALL) },
    refrigerated && { key: 'refrigerated', label: refrigerated === 'true' ? 'Refrigerado' : 'No refrigerado', clear: () => setRefrigerated(ALL) },
  ] as (FilterPill | '')[]).filter((pill): pill is FilterPill => Boolean(pill))

  // What this list shows, for the assistant ("¿cuál de estos está peor?"): filters, order and visible rows.
  useAssistantView(loading ? null : depositsListView({
    rows: filtered, total: deposits.length, filters: activePills.map((pill) => pill.label),
    sort: `${sortLabels[sort.key]} ${sort.dir === 'asc' ? 'ascendente' : 'descendente'}`, phaseOf,
  }))

  // The filter panel closes on a click outside it or on Escape.
  const filtersRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showFilters) return
    const onPointer = (event: MouseEvent) => { if (!filtersRef.current?.contains(event.target as Node)) setShowFilters(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowFilters(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [showFilters])

  const occupiedCount = deposits.filter((item) => item.status === 'occupied').length
  // One toolbar: the section tab already names the page, so no title; filters left, figures and actions right.
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">
      <div ref={filtersRef} className="relative">
        <button type="button" onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} aria-haspopup="dialog" className={`flex min-h-9 items-center gap-2 rounded-xl border px-3 text-[12px] font-semibold transition ${showFilters || activeFilters ? 'border-plum/40 bg-plum-soft text-plum' : 'border-border bg-white text-copy hover:border-[#b9899c]'}`}><SlidersHorizontal className="size-4" />Filtros{activeFilters > 0 && <span className="rounded-full bg-plum px-1.5 text-[10px] leading-4 text-white">{activeFilters}</span>}<ChevronDown className={`size-3.5 transition ${showFilters ? 'rotate-180' : ''}`} /></button>
        {showFilters && <div role="dialog" aria-label="Filtros de depósitos" className="absolute left-0 top-full z-20 mt-2 w-[min(calc(100vw-2rem),380px)] space-y-4 rounded-2xl border border-border bg-white p-4 shadow-[0_12px_32px_rgba(46,38,42,0.14)]">
          <FilterSection label="Localización"><Chip active={!zone} onClick={() => setZone(ALL)}>Todas</Chip>{zones.map((name) => <Chip key={name} active={zone === name} onClick={() => setZone(zone === name ? ALL : name)} count={countBy((item) => item.zone === name)}><LocationIcon zone={name} />{name}</Chip>)}</FilterSection>
          <FilterSection label="Contenido"><Chip active={!content} onClick={() => setContent(ALL)}>Todos</Chip>{categories.map((name) => <Chip key={name} active={content === name} onClick={() => setContent(content === name ? ALL : name)} count={countBy((item) => activeOccupation(item)?.category === name)}><span className={`size-2 rounded-full ${contentDotClass(name)}`} aria-hidden="true" />{name}</Chip>)}<Chip active={content === EMPTY} onClick={() => setContent(content === EMPTY ? ALL : EMPTY)} count={countBy((item) => !activeOccupation(item))}><span className={`size-2 rounded-full ${contentDotClass(null)}`} aria-hidden="true" />Vacío</Chip></FilterSection>
          {phases.length > 0 && <FilterSection label="Fase"><Chip active={!phase} onClick={() => setPhase(ALL)}>Todas</Chip>{phases.map((item) => <Chip key={item.code} active={phase === item.code} onClick={() => setPhase(phase === item.code ? ALL : item.code)} count={countBy((deposit) => phaseOf(deposit)?.code === item.code)}><span className="size-2 rounded-full" style={{ background: item.color }} aria-hidden="true" />{item.name}</Chip>)}</FilterSection>}
          <FilterSection label="Último análisis">
            <Chip active={!analysis} onClick={() => setAnalysis('')}>Todos</Chip>
            {(Object.keys(analysisFilterLabels) as Exclude<AnalysisFilter, ''>[]).map((key) => <Chip key={key} active={analysis === key} onClick={() => setAnalysis(analysis === key ? '' : key)} count={key === 'range' ? undefined : countBy((deposit) => matchesAnalysis(deposit, key, analysisRange))}>{analysisFilterLabels[key]}</Chip>)}
            {analysis === 'range' && (
              <div className="mt-1 grid w-full grid-cols-2 gap-2">
                <label className={labelClass}>Desde<input type="date" value={analysisRange.from} max={analysisRange.to || undefined} onChange={(event) => setAnalysisRange({ ...analysisRange, from: event.target.value })} className={selectClass} /></label>
                <label className={labelClass}>Hasta<input type="date" value={analysisRange.to} min={analysisRange.from || undefined} onChange={(event) => setAnalysisRange({ ...analysisRange, to: event.target.value })} className={selectClass} /></label>
              </div>
            )}
          </FilterSection>
          <div className="grid grid-cols-2 gap-3 border-t border-border pt-4">
            <label className={labelClass}>Estado<select value={status} onChange={(event) => setStatus(event.target.value)} className={selectClass}><option value={ALL}>Todos</option>{statusOptions.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
            <label className={labelClass}>Prioridad<select value={priority} onChange={(event) => setPriority(event.target.value)} className={selectClass}><option value={ALL}>Todas</option>{priorityOptions.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
            {materials.length > 1 && <label className={labelClass}>Material<select value={material} onChange={(event) => setMaterial(event.target.value)} className={selectClass}><option value={ALL}>Todos</option>{materials.map((value) => <option key={value}>{value}</option>)}</select></label>}
            <label className={labelClass}>Refrigerado<select value={refrigerated} onChange={(event) => setRefrigerated(event.target.value)} className={selectClass}><option value={ALL}>Todos</option><option value="true">Sí</option><option value="false">No</option></select></label>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3"><button type="button" onClick={resetFilters} disabled={!activeFilters} className="text-[11.5px] font-semibold text-plum hover:underline disabled:text-muted disabled:no-underline">Limpiar todo</button><button type="button" onClick={() => setShowFilters(false)} className="min-h-8 rounded-lg bg-plum px-3 text-[11.5px] font-semibold text-white hover:bg-plum-dark">Ver {filtered.length} depósitos</button></div>
        </div>}
      </div>
      {activePills.map((pill) => <span key={pill.key} className="inline-flex min-h-7 items-center gap-1.5 rounded-full border border-border bg-white pl-2.5 pr-1 text-[11.5px] font-medium text-copy">{pill.icon}{pill.label}<button type="button" onClick={pill.clear} aria-label={`Quitar filtro ${pill.label}`} className="rounded-full p-0.5 text-muted hover:bg-plum-soft hover:text-plum"><X className="size-3" /></button></span>)}
      {activeFilters > 1 && <button type="button" onClick={resetFilters} className="text-[11.5px] font-semibold text-muted hover:text-plum">Limpiar</button>}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {!loading && <p className="hidden whitespace-nowrap text-[11.5px] text-muted md:block" aria-live="polite">{filtered.length === deposits.length ? <><span className="font-semibold text-copy">{deposits.length}</span> depósitos · {occupiedCount} ocupados</> : <><span className="font-semibold text-copy">{filtered.length}</span> de {deposits.length}</>}</p>}
        <label className={`text-[11px] font-semibold text-muted ${view === 'table' ? 'sm:hidden' : ''}`}><span className="sr-only">Ordenar</span><select value={`${sort.key}:${sort.dir}`} onChange={(event) => { const [key, dir] = event.target.value.split(':'); setSort({ key: key as SortKey, dir: dir as SortDir }) }} className="min-h-8 rounded-lg border border-border bg-white px-2 text-[11.5px] font-medium text-ink">{(Object.keys(sortLabels) as SortKey[]).flatMap((key) => [<option key={`${key}:asc`} value={`${key}:asc`}>{sortLabels[key]} ↑</option>, <option key={`${key}:desc`} value={`${key}:desc`}>{sortLabels[key]} ↓</option>])}</select></label>
        <div className="flex shrink-0 items-center gap-2"><div className="hidden rounded-xl border border-border bg-white p-[3px] sm:flex"><button type="button" onClick={() => setView('table')} aria-label="Vista de tabla" aria-pressed={view === 'table'} className={`rounded-lg p-1.5 ${view === 'table' ? 'bg-plum-soft text-plum' : 'text-muted'}`}><List className="size-4" /></button><button type="button" onClick={() => setView('cards')} aria-label="Vista de tarjetas" aria-pressed={view === 'cards'} className={`rounded-lg p-1.5 ${view === 'cards' ? 'bg-plum-soft text-plum' : 'text-muted'}`}><LayoutGrid className="size-4" /></button></div><button type="button" onClick={() => setShowForm(true)} className="flex h-9 items-center gap-1 whitespace-nowrap rounded-xl bg-plum px-3 text-[12px] font-semibold text-white hover:bg-plum-dark sm:px-3.5"><Plus className="size-4" /><span className="sm:hidden">Nuevo</span><span className="hidden sm:inline">Nuevo depósito</span></button></div>
      </div>
    </div>
    {error && <p role="alert" className="rounded-xl bg-[#f7dadf] p-3 text-[12px] text-[#8e1f33]">{error}</p>}
    {loading ? <p className="p-6 text-center text-[12px] text-muted">Cargando depósitos…</p> : filtered.length === 0 ? <div className="rounded-2xl border border-border bg-white p-8 text-center text-[13px] text-muted">No hay depósitos con estos filtros.{activeFilters > 0 && <button type="button" onClick={resetFilters} className="ml-2 font-semibold text-plum hover:underline">Limpiar filtros</button>}</div> : <>
      {hasMore && <p className="sr-only" aria-live="polite">Mostrando {shown.length} de {filtered.length}</p>}
      <div ref={listRef} style={{ height: listHeight }} className={`overflow-y-auto overscroll-contain ${view === 'table' ? 'sm:rounded-2xl sm:border sm:border-border sm:bg-white' : ''}`}>
      <div className={`${view === 'cards' ? 'sm:grid sm:grid-cols-2 xl:grid-cols-3' : 'sm:hidden'} grid gap-3`}>{shown.map((deposit) => <DepositCard key={deposit.id} deposit={deposit} onOpen={onOpenDeposit} phase={phaseOf(deposit)} />)}</div>
      {view === 'table' && <div className="hidden sm:block"><table className="w-full text-left text-[11.5px]"><thead className="sticky top-0 z-10 bg-[#fdfbfc] text-[10.5px] font-semibold text-muted shadow-[0_1px_0_#eadfe4]"><tr><SortHeader label="Depósito" sortKey="code" sort={sort} onSort={toggleSort} /><SortHeader label="Localización" sortKey="zone" sort={sort} onSort={toggleSort} /><SortHeader label="Contenido y lote" sortKey="content" sort={sort} onSort={toggleSort} /><SortHeader label="Volumen / capacidad" sortKey="fill" sort={sort} onSort={toggleSort} /><SortHeader label="Fase" sortKey="phases" sort={sort} onSort={toggleSort} className="hidden lg:table-cell" /><SortHeader label="Último análisis" sortKey="analysis" sort={sort} onSort={toggleSort} /><SortHeader label="Estado" sortKey="status" sort={sort} onSort={toggleSort} /></tr></thead><tbody>{shown.map((deposit) => { const occupation = activeOccupation(deposit); const fill = occupation ? Math.min(100, occupation.volumeLiters / deposit.capacityLiters * 100) : 0; return <tr key={deposit.id} onClick={() => onOpenDeposit(deposit.code)} className="group cursor-pointer border-t border-border hover:bg-plum-soft/40"><td className="px-3 py-3"><button type="button" onClick={(event) => { event.stopPropagation(); onOpenDeposit(deposit.code) }} className="font-mono text-[12px] font-semibold text-plum group-hover:underline">{deposit.code}</button><div className="text-[10px] text-muted">{deposit.material}{deposit.refrigerated ? ' · refrigerado' : ''}</div></td><td className="px-3 py-3"><LocationBadge zone={deposit.zone} />{deposit.position && <div className="mt-1 text-[10px] text-muted">{deposit.position}</div>}</td><td className="px-3 py-3"><ContentBadge category={occupation ? occupation.category : undefined} />{occupation && <div className="mt-1 font-mono text-[10.5px] text-muted">{occupation.lotCode}</div>}</td><td className="px-3 py-3"><span className="font-mono">{formatLiters(occupation?.volumeLiters ?? 0)} / {formatLiters(deposit.capacityLiters)} L</span><div className="mt-1.5 flex max-w-[160px] items-center gap-2"><div className="h-1 flex-1 rounded bg-[#efe6ea]"><div className="h-full rounded bg-plum" style={{ width: `${fill}%` }} /></div><span className="w-8 text-right font-mono text-[10px] text-muted">{Math.round(fill)}%</span></div></td><td className="hidden max-w-[180px] px-3 py-3 lg:table-cell">{occupation ? <PhaseBadge phase={phaseOf(deposit)} /> : <span className="text-[11px] text-muted">—</span>}</td><td className="whitespace-nowrap px-3 py-3"><LastAnalysis deposit={deposit} /></td><td className="px-3 py-3"><span className={`whitespace-nowrap rounded-full px-1.5 py-px text-[9.5px] font-semibold leading-tight tracking-wide ${statusClass(deposit)}`}>{statusLabel(deposit)}</span></td></tr> })}</tbody></table></div>}
      {/* Reaching this marker renders the next batch. */}
      <div ref={sentinel} aria-hidden="true" className="h-px" />
      {hasMore && <p className="py-3 text-center text-[11px] text-muted" role="status">Cargando más depósitos…</p>}
      </div>
    </>}
    {showForm && <DepositForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); loadDeposits(); resetFilters() }} />}
  </div>
}
