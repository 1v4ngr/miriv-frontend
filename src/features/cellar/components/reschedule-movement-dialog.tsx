import { useState, type FormEvent } from 'react'
import { CalendarClock, X } from 'lucide-react'
import { movementsApi } from '../services/movements-api'

interface RescheduleMovementDialogProps {
  /** Code of the movement whose date we are correcting. */
  movementCode: string
  /** Current effective date of the movement (ISO string). */
  effectiveAt: string
  /** Short title shown on the dialog header (e.g. "Corregir fecha de entrada"). */
  title?: string
  /** Extra help text shown under the title. */
  hint?: string
  /** Called once the reschedule succeeds — parent usually refreshes data. */
  onClose: () => void
  onSaved: () => void
}

/**
 * Dialog for fixing when a movement happened without leaving the current page. Used from the deposit
 * detail view so users can correct the entry date when they entered it wrong, instead of having to
 * drill down into the movement receipt.
 *
 * Sends {@link movementsApi.reschedule} (PATCH /api/movements/{code}), which the server applies to the
 * movement and the occupations it opened or closed.
 */
export function RescheduleMovementDialog({ movementCode, effectiveAt, title = 'Corregir fecha', hint, onClose, onSaved }: RescheduleMovementDialogProps) {
  const current = new Date(effectiveAt)
  const pad = (value: number) => String(value).padStart(2, '0')
  const [date, setDate] = useState(`${current.getFullYear()}-${pad(current.getMonth() + 1)}-${pad(current.getDate())}`)
  const [time, setTime] = useState(`${pad(current.getHours())}:${pad(current.getMinutes())}`)
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await movementsApi.reschedule(movementCode, {
        effectiveDate: date,
        effectiveTime: time ? `${time}:00` : undefined,
        reason: reason.trim() || undefined,
      })
      onSaved()
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar la corrección.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="reschedule-title" onMouseDown={(event) => event.stopPropagation()} className="h-full w-full max-w-[420px] overflow-y-auto bg-[#fdfbfc] p-5 shadow-xl sm:p-6">
        <div className="flex items-center justify-between">
          <h2 id="reschedule-title" className="flex items-center gap-2 text-[20px] font-semibold">
            <CalendarClock className="size-5 text-plum" />{title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-plum-soft"><X className="size-4" /></button>
        </div>
        <p className="mt-2 text-[12.5px] text-muted">
          {hint ?? 'Cambia cuándo ocurrió el movimiento. Las ocupaciones que abrió o cerraron se ajustan solas, y en una entrada inicial también la fecha del lote. Los litros y los depósitos no cambian.'}
        </p>
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[12px] font-semibold text-copy">Fecha *
              <input type="date" required value={date} onChange={(event) => setDate(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e0d2d9] bg-white p-2 text-[13px] font-normal outline-none focus:border-[#b9899c]" />
            </label>
            <label className="block text-[12px] font-semibold text-copy">Hora
              <input type="time" step="60" value={time} onChange={(event) => setTime(event.target.value)} className="mt-1.5 w-full rounded-xl border border-[#e0d2d9] bg-white p-2 text-[13px] font-normal outline-none focus:border-[#b9899c]" />
            </label>
          </div>
          <label className="block text-[12px] font-semibold text-copy">Motivo
            <textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="p. ej. Me equivoqué al registrar la fecha" className="mt-1.5 w-full rounded-xl border border-[#e0d2d9] bg-white p-2 text-[13px] font-normal outline-none focus:border-[#b9899c]" />
          </label>
          {error && <p role="alert" className="text-[12px] text-[#8e3b4a]">{error}</p>}
          <button type="submit" disabled={submitting} className="min-h-10 w-full rounded-xl bg-plum px-4 text-[12.5px] font-semibold text-white hover:bg-plum-dark disabled:opacity-60">
            {submitting ? 'Guardando…' : 'Guardar fecha'}
          </button>
        </form>
      </section>
    </div>
  )
}