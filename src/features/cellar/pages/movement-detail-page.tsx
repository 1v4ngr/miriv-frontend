// F4-01: receipt of a single movement (UI15). Shows before/after balances per line and lets the
// authorised user execute or cancel a PLANNED movement from here.
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowLeft, CalendarClock, CheckCircle2, History, Trash2, X } from 'lucide-react'
import { movementsApi, type MovementDetail } from '../services/movements-api'
import type { MovementStatus, MovementType } from '../types'
import { useCan, useIsSuperAdmin } from '../../../hooks/use-permissions'

interface MovementDetailPageProps {
  code: string
  onBack: () => void
}

// F4-01: enum codes from the backend cover the wire types (Trasiego / Trasvase / Salida)
// plus the storage types that the server may resolve at the end of an execution (MIX, EXIT,
// TRANSFER_FULL, TRANSFER_PARTIAL, ENTRY, LOSS, etc.).
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
const STATUS_LABELS: Record<MovementStatus, string> = { PLANNED: 'Previsto', EXECUTED: 'Ejecutado', CANCELLED: 'Cancelado' }

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

function formatVolume(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${Number(value).toLocaleString('es', { maximumFractionDigits: 2 })} L`
}

function formatBalanceChange(before: number | null | undefined, after: number | null | undefined): string {
  if (before === null || before === undefined || after === null || after === undefined) return '—'
  const delta = after - before
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±'
  return `${sign}${Math.abs(delta).toLocaleString('es', { maximumFractionDigits: 2 })} L (de ${before.toLocaleString('es', { maximumFractionDigits: 2 })} → ${after.toLocaleString('es', { maximumFractionDigits: 2 })})`
}

interface CancelFormProps { onClose: () => void; onCancel: (reason: string) => Promise<void> }
function CancelForm({ onClose, onCancel }: CancelFormProps) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!reason.trim()) { setError('Indica el motivo de la cancelación.'); return }
    setSubmitting(true); setError('')
    try { await onCancel(reason.trim()); onClose() } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo cancelar.') } finally { setSubmitting(false) }
  }
  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="cancel-movement-title" onMouseDown={(event) => event.stopPropagation()} className="h-full w-full max-w-[440px] overflow-y-auto bg-[#fdfbfc] p-5 shadow-xl sm:p-6">
        <div className="flex items-center justify-between">
          <h2 id="cancel-movement-title" className="text-[20px] font-semibold">Cancelar previsto</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-plum-soft"><X className="size-4" /></button>
        </div>
        <p className="mt-2 text-[12.5px] text-muted">El movimiento se mantiene en el historial con el motivo de cancelación.</p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <label className="block text-[12px] font-semibold text-copy">Motivo *
            <textarea required value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-1.5 w-full rounded-xl border border-[#e0d2d9] bg-white p-2 text-[13px] font-normal outline-none focus:border-[#b9899c]" />
          </label>
          {error && <p role="alert" className="text-[12px] text-[#8e3b4a]">{error}</p>}
          <button type="submit" disabled={submitting} className="min-h-10 w-full rounded-xl bg-plum px-4 text-[12.5px] font-semibold text-white hover:bg-plum-dark disabled:opacity-60">{submitting ? 'Cancelando…' : 'Cancelar previsto'}</button>
        </form>
      </section>
    </div>
  )
}

interface CorrectionFormProps {
  effectiveAt: string
  mode: 'reschedule' | 'undo'
  onClose: () => void
  onSubmit: (input: { date: string; time: string; reason: string }) => Promise<void>
}

/** Fixing a movement entered wrong: move its date/time, or delete it and put the wine back. */
function CorrectionForm({ effectiveAt, mode, onClose, onSubmit }: CorrectionFormProps) {
  const current = new Date(effectiveAt)
  const pad = (value: number) => String(value).padStart(2, '0')
  const [date, setDate] = useState(`${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`)
  const [time, setTime] = useState(`${pad(current.getHours())}:${pad(current.getMinutes())}`)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const undo = mode === 'undo'

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (undo && !reason.trim()) { setError('Indica el motivo de la eliminación.'); return }
    setSubmitting(true); setError('')
    try {
      await onSubmit({ date, time, reason: reason.trim() })
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido completar la corrección.')
    } finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="correct-movement-title" onMouseDown={(event) => event.stopPropagation()} className="h-full w-full max-w-[440px] overflow-y-auto bg-[#fdfbfc] p-5 shadow-xl sm:p-6">
        <div className="flex items-center justify-between">
          <h2 id="correct-movement-title" className="text-[20px] font-semibold">{undo ? 'Eliminar movimiento' : 'Corregir fecha'}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-plum-soft"><X className="size-4" /></button>
        </div>
        <p className={`mt-2 text-[12.5px] ${undo ? 'text-[#8e3b4a]' : 'text-muted'}`}>
          {undo
            ? 'El vino vuelve a su depósito de origen y el movimiento desaparece del historial. Se bloquea si después hubo otros movimientos o analíticas.'
            : 'Cambia cuándo ocurrió el movimiento. Las ocupaciones que abrió o cerró se ajustan solas, y en una entrada inicial también la fecha del lote. Los litros y los depósitos no cambian.'}
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {!undo && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[12px] font-semibold text-copy">Fecha *
                <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e0d2d9] bg-white p-2 text-[13px] font-normal outline-none focus:border-[#b9899c]" />
              </label>
              <label className="block text-[12px] font-semibold text-copy">Hora
                <input type="time" step="60" value={time} onChange={(event) => setTime(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e0d2d9] bg-white p-2 text-[13px] font-normal outline-none focus:border-[#b9899c]" />
              </label>
            </div>
          )}
          <label className="block text-[12px] font-semibold text-copy">{undo ? 'Motivo *' : 'Motivo'}
            <textarea required={undo} value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-[#e0d2d9] bg-white p-2 text-[13px] font-normal outline-none focus:border-[#b9899c]" />
          </label>
          {error && <p role="alert" className="text-[12px] text-[#8e3b4a]">{error}</p>}
          <button type="submit" disabled={submitting} className={`min-h-10 w-full rounded-xl px-4 text-[12.5px] font-semibold text-white disabled:opacity-60 ${undo ? 'bg-[#8e1f33]' : 'bg-plum hover:bg-plum-dark'}`}>
            {submitting ? 'Guardando…' : undo ? 'Eliminar y devolver el vino' : 'Guardar fecha'}
          </button>
        </form>
      </section>
    </div>
  )
}

export function MovementDetailPage({ code, onBack }: MovementDetailPageProps) {
  const isSuperAdmin = useIsSuperAdmin()
  const canCorrect = useCan('MOVEMENT_REGISTER')
  const [detail, setDetail] = useState<MovementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const [correction, setCorrection] = useState<'reschedule' | 'undo'>()
  const [actionMessage, setActionMessage] = useState('')

  const load = () => { setLoading(true); setError(''); movementsApi.get(code).then(setDetail).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se ha podido cargar el movimiento.')).finally(() => setLoading(false)) }
  useEffect(load, [code])

  const totals = useMemo(() => {
    if (!detail) return { volume: 0, loss: 0, count: 0 }
    return detail.lines.reduce((accumulator, line) => ({
      volume: accumulator.volume + Number(line.volumeLiters ?? 0),
      loss: accumulator.loss + Number(line.lossLiters ?? 0),
      count: accumulator.count + 1,
    }), { volume: 0, loss: 0, count: 0 })
  }, [detail])

  async function executePlanned() {
    if (!detail) return
    setActionMessage('Ejecutando…')
    try {
      await movementsApi.execute(detail.code)
      setActionMessage('Movimiento ejecutado. Recargando…')
      load()
    } catch (cause) {
      setActionMessage('')
      setError(cause instanceof Error ? cause.message : 'No se pudo ejecutar el movimiento.')
    }
  }

  async function reschedule(input: { date: string; time: string; reason: string }) {
    if (!detail) return
    await movementsApi.reschedule(detail.code, {
      effectiveDate: input.date,
      effectiveTime: input.time ? `${input.time}:00` : undefined,
      reason: input.reason || undefined,
    })
    setActionMessage('Fecha corregida. Recargando…')
    load()
  }

  async function undoMovement(input: { reason: string }) {
    if (!detail) return
    await movementsApi.undo(detail.code, input.reason)
    onBack()
  }

  async function cancelPlanned(reason: string) {
    if (!detail) return
    await movementsApi.cancel(detail.code, reason)
    setActionMessage('Cancelado. Recargando…')
    load()
  }

  if (loading && !detail) return <section className="rounded-2xl border border-border bg-white p-5 text-[13px] text-muted">Cargando recibo…</section>
  if (error && !detail) return <section role="alert" className="rounded-2xl border border-[#d4b6b9] bg-[#f9ecec] p-5 text-[13px] text-[#8e3b4a]">{error}</section>
  if (!detail) return null

  return (
    <section aria-labelledby="movement-receipt-title" className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <button type="button" onClick={onBack} aria-label="Volver al historial" className="mt-1 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white hover:bg-plum-soft"><ArrowLeft className="size-4" /></button>
          <div>
            <p className="font-mono text-[12px] text-muted">{detail.code}</p>
            <h1 id="movement-receipt-title" className="text-[24px] font-semibold tracking-[-0.02em]">{TYPE_LABELS[detail.type] ?? detail.type}</h1>
            <p className="mt-1 text-[13px] text-muted">Responsable {detail.responsible || '—'} · Registrado por {detail.registeredBy || '—'}</p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${statusToneClass(detail.status)}`}>{STATUS_LABELS[detail.status]}</span>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="text-[12px] font-semibold text-muted">Efectivo</p>
          <p className="mt-1 text-[14px] font-semibold">{formatDateTime(detail.effectiveAt)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="text-[12px] font-semibold text-muted">Registrado</p>
          <p className="mt-1 text-[14px] font-semibold">{formatDateTime(detail.registeredAt)}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="text-[12px] font-semibold text-muted">Líneas / volumen / merma</p>
          <p className="mt-1 text-[14px] font-semibold">{totals.count} · {totals.volume.toLocaleString('es')} L · {totals.loss.toLocaleString('es')} L</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-4">
        <h2 className="text-[12px] font-semibold uppercase tracking-wide text-muted">Motivo</h2>
        <p className="mt-2 text-[13px] text-copy">{detail.reason || '—'}</p>
        {detail.cancelledReason && (
          <p className="mt-3 text-[12.5px] text-[#8e3b4a]"><strong>Cancelado:</strong> {detail.cancelledReason}</p>
        )}
      </div>

      {detail.lines.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-white p-6 text-center text-[13px] text-muted">Movimiento previsto: todavía sin líneas registradas. Se generan al ejecutar.</p>
      ) : (
        <div className="rounded-2xl border border-border bg-white p-4">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-muted">Líneas</h2>
          <ul className="divide-y divide-[#f1e6ea]">
            {detail.lines.map((line, index) => (
              <li key={index} className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[1fr_1fr]">
                <div>
                  <p className="text-[12px] font-semibold text-muted">Origen</p>
                  <p className="mt-1 text-[14px] font-semibold">{line.sourceDeposit || '—'}</p>
                  {line.sourceContent && <p className="text-[12px] text-muted">{line.sourceContent}</p>}
                  <p className="mt-1 text-[12px] text-copy">Saldo: {formatBalanceChange(line.sourceBefore, line.sourceAfter)}</p>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-muted">Destino</p>
                  <p className="mt-1 text-[14px] font-semibold">{line.destinationDeposit || 'salida'}</p>
                  {line.destinationContent && <p className="text-[12px] text-muted">{line.destinationContent}</p>}
                  <p className="mt-1 text-[12px] text-copy">Saldo: {formatBalanceChange(line.destinationBefore, line.destinationAfter)}</p>
                </div>
                <p className="text-[12.5px] text-copy sm:col-span-2">Volumen: {formatVolume(line.volumeLiters)}{line.lossLiters ? ` · Merma: ${formatVolume(line.lossLiters)}` : ''}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        {canCorrect && detail.status !== 'CANCELLED' && (
          <button type="button" onClick={() => setCorrection('reschedule')} className="flex min-h-9 items-center gap-1 rounded-xl border border-border bg-white px-3 text-[12px] font-semibold hover:bg-plum-soft"><CalendarClock className="size-3.5" />Corregir fecha</button>
        )}
        {isSuperAdmin && (
          <button type="button" onClick={() => setCorrection('undo')} className="flex min-h-9 items-center gap-1 rounded-xl border border-[#e3aab6] bg-white px-3 text-[12px] font-semibold text-[#8e1f33]"><Trash2 className="size-3.5" />Eliminar movimiento</button>
        )}
      </div>
      {correction && (
        <CorrectionForm effectiveAt={detail.effectiveAt} mode={correction} onClose={() => setCorrection(undefined)}
          onSubmit={correction === 'undo' ? undoMovement : reschedule} />
      )}
      {detail.status === 'PLANNED' && (
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-border bg-white p-4">
          <button type="button" onClick={() => setShowCancel(true)} className="flex min-h-9 items-center gap-1 rounded-xl border border-border px-3 text-[12px] font-semibold hover:bg-plum-soft"><X className="size-3.5" />Cancelar previsto</button>
          <button type="button" onClick={executePlanned} className="flex min-h-9 items-center gap-1 rounded-xl bg-plum px-3 text-[12px] font-semibold text-white"><CheckCircle2 className="size-3.5" />Ejecutar</button>
        </div>
      )}

      {showCancel && <CancelForm onClose={() => setShowCancel(false)} onCancel={cancelPlanned} />}
      {actionMessage && <p className="text-[12px] text-muted"><History className="mr-1 inline size-3.5" />{actionMessage}</p>}
    </section>
  )
}