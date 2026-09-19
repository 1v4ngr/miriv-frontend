import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, LayoutGrid, List, Plus, SlidersHorizontal, X } from 'lucide-react'
import { DepositCard } from '../components/deposit-card'
import { cellarApi } from '../services/cellar-api'
import type { Deposit, NewDeposit } from '../types'
import { activeOccupation, formatLiters, statusClass, statusLabel } from '../utils'
import { useCurrentProfile } from '../../../hooks/use-current-profile'

interface DepositsPageProps {
  search: string
  onOpenDeposit: (code: string) => void
}

const pageSize = 5
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

export function DepositsPage({ search, onOpenDeposit }: DepositsPageProps) {
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [zone, setZone] = useState('Todas')
  const [status, setStatus] = useState('Todos')
  const [priority, setPriority] = useState('Todas')
  const [view, setView] = useState<'table' | 'cards'>('table')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const loadDeposits = () => { setLoading(true); cellarApi.getDeposits().then(setDeposits).catch((cause) => setError(cause instanceof Error ? cause.message : 'Error al cargar depósitos.')).finally(() => setLoading(false)) }
  useEffect(loadDeposits, [])

  const filtered = useMemo(() => deposits.filter((deposit) => {
    const term = search.toLocaleUpperCase('es').replace(/\s+/g, '')
    const occupation = activeOccupation(deposit)
    return (!term || `${deposit.code}${occupation?.lotCode ?? ''}${occupation?.category ?? ''}`.toLocaleUpperCase('es').replace(/\s+/g, '').includes(term)) && (zone === 'Todas' || deposit.zone === zone) && (status === 'Todos' || deposit.status === status) && (priority === 'Todas' || deposit.priority === priority)
  }), [deposits, search, zone, status, priority])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const shown = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const resetFilters = () => { setZone('Todas'); setStatus('Todos'); setPriority('Todas'); setPage(1) }

  return <div className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-[23px] font-semibold tracking-tight">Depósitos</h1><p className="mt-1 text-[12px] text-muted">{deposits.length} recipientes · {deposits.filter((item) => item.status === 'occupied').length} ocupados · {deposits.filter((item) => item.priority === 'overdue').length} con control vencido</p></div><div className="flex gap-2"><div className="hidden rounded-xl border border-border bg-white p-1 sm:flex"><button type="button" onClick={() => setView('table')} aria-label="Vista de tabla" aria-pressed={view === 'table'} className={`rounded-lg p-2 ${view === 'table' ? 'bg-plum-soft text-plum' : 'text-muted'}`}><List className="size-4" /></button><button type="button" onClick={() => setView('cards')} aria-label="Vista de tarjetas" aria-pressed={view === 'cards'} className={`rounded-lg p-2 ${view === 'cards' ? 'bg-plum-soft text-plum' : 'text-muted'}`}><LayoutGrid className="size-4" /></button></div><button type="button" onClick={() => setShowForm(true)} className="flex min-h-10 items-center gap-1 rounded-xl bg-plum px-3.5 text-[12px] font-semibold text-white hover:bg-plum-dark"><Plus className="size-4" />Nuevo depósito</button></div></div>
    <div className="rounded-2xl border border-border bg-[#fdfbfc] p-3 sm:p-4"><button type="button" onClick={() => setShowFilters(!showFilters)} className="flex items-center gap-2 text-[12px] font-semibold text-plum sm:hidden"><SlidersHorizontal className="size-4" />{showFilters ? 'Ocultar filtros' : 'Filtros'}</button><div className={`${showFilters ? 'mt-3 flex' : 'hidden'} flex-wrap gap-2 sm:flex sm:mt-0`}>{([['Zona', zone, setZone, ['Todas', ...Array.from(new Set(deposits.map((item) => item.zone).filter((z): z is string => Boolean(z))))]], ['Estado', status, setStatus, ['Todos', 'occupied', 'available', 'maintenance', 'pending_cleaning', 'cleaning']], ['Prioridad', priority, setPriority, ['Todas', 'critical', 'overdue', 'high', 'none']]] as const).map(([label, value, setter, options]) => <label key={label} className="text-[11px] font-semibold text-muted">{label}<select value={value ?? ''} onChange={(event) => { setter(event.target.value); setPage(1) }} className="ml-2 min-h-9 rounded-lg border border-[#e0d2d9] bg-white px-2 text-[11.5px] font-medium text-ink"><option value={options[0]}>{options[0]}</option>{options.slice(1).map((option) => <option key={option} value={option}>{({ occupied: 'Ocupado', available: 'Disponible', maintenance: 'Mantenimiento', pending_cleaning: 'Pendiente de limpieza', cleaning: 'En limpieza', critical: 'Crítica', overdue: 'Control vencido', high: 'Alta', none: 'Sin prioridad' } as Record<string, string>)[option as string] ?? option}</option>)}</select></label>)}<button type="button" onClick={resetFilters} className="text-[11.5px] font-semibold text-plum hover:underline">Limpiar filtros</button></div></div>
    {error && <p role="alert" className="rounded-xl bg-[#f7dadf] p-3 text-[12px] text-[#8e1f33]">{error}</p>}
    {loading ? <p className="p-6 text-center text-[12px] text-muted">Cargando depósitos…</p> : filtered.length === 0 ? <div className="rounded-2xl border border-border bg-white p-8 text-center text-[13px] text-muted">No hay depósitos con estos filtros.</div> : <>
      <div className={`${view === 'cards' ? 'sm:grid sm:grid-cols-2 xl:grid-cols-3' : 'sm:hidden'} grid gap-3`}>{shown.map((deposit) => <DepositCard key={deposit.id} deposit={deposit} onOpen={onOpenDeposit} />)}</div>
      {view === 'table' && <div className="hidden overflow-hidden rounded-2xl border border-border bg-white sm:block"><table className="w-full text-left text-[11.5px]"><thead className="bg-[#fdfbfc] text-[10.5px] font-semibold text-muted"><tr><th className="px-3 py-3">Depósito</th><th className="px-3 py-3">Zona</th><th className="px-3 py-3">Contenido y lote</th><th className="px-3 py-3">Volumen / capacidad</th><th className="hidden px-3 py-3 xl:table-cell">Fases</th><th className="px-3 py-3">Último control</th></tr></thead><tbody>{shown.map((deposit) => { const occupation = activeOccupation(deposit); return <tr key={deposit.id} className="border-t border-border hover:bg-[#fdfbfc]"><td className="px-3 py-3"><div className="flex items-center justify-between gap-2"><button type="button" onClick={() => onOpenDeposit(deposit.code)} className="font-mono text-[12px] font-semibold text-plum hover:underline">{deposit.code}</button><span className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-px text-[9.5px] font-semibold leading-tight tracking-wide ${statusClass(deposit)}`}>{statusLabel(deposit)}</span></div></td><td className="px-3 py-3 text-copy">{deposit.zone}<div className="text-[10px] text-muted">{deposit.position}</div></td><td className="px-3 py-3">{occupation ? <><span>{occupation.category}</span><div className="font-mono text-[10.5px] text-muted">{occupation.lotCode}</div></> : <span className="text-muted">Sin contenido</span>}</td><td className="px-3 py-3"><span className="font-mono">{formatLiters(occupation?.volumeLiters ?? 0)} / {formatLiters(deposit.capacityLiters)} L</span><div className="mt-1.5 h-1 w-full max-w-[120px] rounded bg-[#efe6ea]"><div className="h-full rounded bg-plum" style={{ width: `${occupation ? Math.min(100, occupation.volumeLiters / deposit.capacityLiters * 100) : 0}%` }} /></div></td><td className="hidden px-3 py-3 text-[10.5px] text-copy xl:table-cell">{occupation ? <><div>FA {occupation.alcoholicState}</div><div>FML {occupation.malolacticState}</div></> : 'No aplica'}</td><td className="px-3 py-3 text-copy">{deposit.lastControl ?? 'Sin controles'}<div className="text-[10px] text-muted">{deposit.lastControlAge ?? ''}</div></td></tr> })}</tbody></table></div>}
      <div className="flex items-center justify-between text-[11.5px] text-muted"><span>{shown.length} de {filtered.length} resultados</span><div className="flex items-center gap-1"><button type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} aria-label="Página anterior" className="rounded-lg border border-border bg-white p-1.5 disabled:opacity-40"><ChevronLeft className="size-4" /></button><span className="px-2">{currentPage} / {pageCount}</span><button type="button" disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Página siguiente" className="rounded-lg border border-border bg-white p-1.5 disabled:opacity-40"><ChevronRight className="size-4" /></button></div></div>
    </>}
    {showForm && <DepositForm onClose={() => setShowForm(false)} onCreated={() => { setShowForm(false); loadDeposits(); resetFilters() }} />}
  </div>
}
