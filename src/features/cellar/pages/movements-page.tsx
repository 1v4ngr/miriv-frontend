// F4-01: history of movements (UI14). Server-paged; filters compose into a single query.
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Filter, X } from 'lucide-react'
import { movementsApi, type MovementFilters, type MovementSummary } from '../services/movements-api'
import type { MovementStatus, MovementType } from '../types'

interface MovementsPageProps {
  search: string
  onOpenMovement: (code: string) => void
}

const STATUS_LABELS: Record<MovementStatus, string> = {
  PLANNED: 'Previsto',
  EXECUTED: 'Ejecutado',
  CANCELLED: 'Cancelado',
}

const TYPE_LABELS: Record<string, string> = {
  Trasiego: 'Trasiego',
  Trasvase: 'Trasvase',
  Salida: 'Salida',
  TRANSFER_PARTIAL: 'Trasiego parcial',
  TRANSFER_FULL: 'Trasiego completo',
  EXIT: 'Salida',
  MIX: 'Mezcla',
  ENTRY: 'Entrada inicial',
  LOSS: 'Pérdida',
}

function statusToneClass(status: MovementStatus): string {
  switch (status) {
    case 'PLANNED': return 'border-[#d8c1c9] bg-[#f6ecf1] text-[#7a3a55]'
    case 'CANCELLED': return 'border-[#d4b6b9] bg-[#f9ecec] text-[#8e3b4a]'
    default: return 'border-[#cdd6c5] bg-[#eef3e7] text-[#3f6b2c]'
  }
}

function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const initialFilters: MovementFilters = {
  from: '',
  to: '',
  deposit: '',
  lot: '',
  type: undefined,
  status: undefined,
  author: '',
  q: '',
  page: 0,
  size: 25,
}

export function MovementsPage({ search, onOpenMovement }: MovementsPageProps) {
  const [filters, setFilters] = useState<MovementFilters>({ ...initialFilters })
  const [items, setItems] = useState<MovementSummary[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    movementsApi.list({ ...filters, page, size: 25, q: filters.q || search })
      .then((response) => { if (!active) return; setItems(response.items); setTotal(response.total) })
      .catch((cause) => { if (!active) return; setError(cause instanceof Error ? cause.message : 'No se ha podido cargar el historial.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, page, search])

  const totalPages = Math.max(1, Math.ceil(total / 25))
  const rangeStart = total === 0 ? 0 : page * 25 + 1
  const rangeEnd = Math.min(total, (page + 1) * 25)

  const groupedByDay = useMemo(() => {
    const groups = new Map<string, MovementSummary[]>()
    for (const item of items) {
      const day = new Date(item.effectiveAt).toLocaleDateString('es', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
      const existing = groups.get(day)
      if (existing) existing.push(item)
      else groups.set(day, [item])
    }
    return Array.from(groups.entries())
  }, [items])

  function reset() {
    setFilters({ ...initialFilters })
    setPage(0)
  }

  function applyFreeText(value: string) {
    setFilters((current) => ({ ...current, q: value }))
    setPage(0)
  }

  return (
    <section aria-labelledby="movements-title" className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 id="movements-title" className="text-[24px] font-semibold tracking-[-0.02em]">Movimientos</h1>
          <p className="mt-1 text-[13px] text-muted">Historial de trasiegos, trasvases, salidas y previstos en tu ámbito.</p>
        </div>
        <button type="button" onClick={() => setShowFilters((current) => !current)}
          className={`flex min-h-9 items-center gap-1 rounded-xl border px-3 text-[12px] font-semibold ${showFilters ? 'border-plum bg-plum-soft' : 'border-border bg-white'}`}>
          <Filter className="size-3.5" />Filtros
        </button>
      </header>

      {showFilters && (
        <div className="grid gap-3 rounded-2xl border border-border bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-[12px] font-semibold text-copy">Desde<input type="date" value={filters.from ?? ''} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className="mt-1 h-9 w-full rounded-lg border border-[#e0d2d9] px-2 text-[12.5px] font-normal" /></label>
          <label className="text-[12px] font-semibold text-copy">Hasta<input type="date" value={filters.to ?? ''} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className="mt-1 h-9 w-full rounded-lg border border-[#e0d2d9] px-2 text-[12.5px] font-normal" /></label>
          <label className="text-[12px] font-semibold text-copy">Depósito<input value={filters.deposit ?? ''} onChange={(event) => setFilters((current) => ({ ...current, deposit: event.target.value }))} className="mt-1 h-9 w-full rounded-lg border border-[#e0d2d9] px-2 text-[12.5px] font-normal" placeholder="E-8" /></label>
          <label className="text-[12px] font-semibold text-copy">Lote<input value={filters.lot ?? ''} onChange={(event) => setFilters((current) => ({ ...current, lot: event.target.value }))} className="mt-1 h-9 w-full rounded-lg border border-[#e0d2d9] px-2 text-[12.5px] font-normal" placeholder="M-2026-01" /></label>
          <label className="text-[12px] font-semibold text-copy">Tipo<select value={filters.type ?? ''} onChange={(event) => setFilters((current) => ({ ...current, type: (event.target.value || undefined) as MovementType | undefined }))} className="mt-1 h-9 w-full rounded-lg border border-[#e0d2d9] px-2 text-[12.5px] font-normal"><option value="">Todos</option>{(Object.keys(TYPE_LABELS) as MovementType[]).map((value) => <option key={value} value={value}>{TYPE_LABELS[value]}</option>)}</select></label>
          <label className="text-[12px] font-semibold text-copy">Estado<select value={filters.status ?? ''} onChange={(event) => setFilters((current) => ({ ...current, status: (event.target.value || undefined) as MovementStatus | undefined }))} className="mt-1 h-9 w-full rounded-lg border border-[#e0d2d9] px-2 text-[12.5px] font-normal"><option value="">Todos</option>{(Object.keys(STATUS_LABELS) as MovementStatus[]).map((value) => <option key={value} value={value}>{STATUS_LABELS[value]}</option>)}</select></label>
          <label className="text-[12px] font-semibold text-copy">Autor<input value={filters.author ?? ''} onChange={(event) => setFilters((current) => ({ ...current, author: event.target.value }))} className="mt-1 h-9 w-full rounded-lg border border-[#e0d2d9] px-2 text-[12.5px] font-normal" placeholder="m.solana" /></label>
          <label className="text-[12px] font-semibold text-copy">Código<input value={filters.q ?? ''} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} onBlur={(event) => applyFreeText(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-[#e0d2d9] px-2 text-[12.5px] font-normal" placeholder="MOV-2026-…" /></label>
          <div className="sm:col-span-2 lg:col-span-4 flex items-center justify-end">
            <button type="button" onClick={reset} className="flex min-h-8 items-center gap-1 rounded-lg border border-border px-2.5 text-[11.5px] font-semibold text-copy"><X className="size-3" />Limpiar filtros</button>
          </div>
        </div>
      )}

      <p className="text-[12px] text-muted">{loading ? 'Cargando…' : error ? <span className="text-[#8e3b4a]">{error}</span> : `${total} movimiento${total === 1 ? '' : 's'} · mostrando ${rangeStart}–${rangeEnd}`}</p>

      {groupedByDay.length === 0 && !loading && !error && (
        <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-[13px] text-muted">No hay movimientos que coincidan con los filtros.</p>
      )}

      <div className="flex flex-col gap-4">
        {groupedByDay.map(([day, rows]) => (
          <article key={day} className="rounded-2xl border border-border bg-white p-4">
            <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-muted">{day}</h2>
            <ul className="divide-y divide-[#f1e6ea]">
              {rows.map((row) => (
                <li key={row.code} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[110px_minmax(0,1fr)_minmax(0,140px)_minmax(0,140px)_auto] sm:items-center sm:gap-3">
                  <button type="button" onClick={() => onOpenMovement(row.code)} className="justify-self-start font-mono text-[12px] text-plum hover:underline">{row.code}</button>
                  <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
                    <span className="font-semibold">{TYPE_LABELS[row.type as MovementType] ?? row.type}</span>
                    <span className="text-muted">·</span>
                    <span>{row.sourceDeposits.join(', ') || '—'}</span>
                    <ArrowRight className="size-3.5 text-muted" aria-hidden="true" />
                    <span>{row.destinationDeposits.join(', ') || 'salida'}</span>
                  </div>
                  <span className="text-[12px] text-muted">{formatDateTime(row.effectiveAt)}</span>
                  <span className="text-[12px] text-muted">{row.volumeLiters.toLocaleString('es')} L · {row.responsible}</span>
                  <span className={`justify-self-start rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusToneClass(row.status)}`}>{STATUS_LABELS[row.status]}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <nav className="flex items-center justify-between text-[12px] text-muted" aria-label="Paginación de movimientos">
        <button type="button" onClick={() => setPage(0)} disabled={page === 0} className="rounded-lg border border-border px-2.5 py-1 disabled:opacity-50">«</button>
        <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 disabled:opacity-50"><ArrowLeft className="size-3" />Anterior</button>
        <span>Página {page + 1} de {totalPages}</span>
        <button type="button" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={page >= totalPages - 1} className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 disabled:opacity-50">Siguiente<ArrowRight className="size-3" /></button>
        <button type="button" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} className="rounded-lg border border-border px-2.5 py-1 disabled:opacity-50">»</button>
      </nav>
    </section>
  )
}