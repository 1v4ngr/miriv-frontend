import { useEffect, useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'
import { cellarApi } from '../services/cellar-api'
import { profileApi, type CenterMember } from '../../../services/profile-api'
import { useCurrentProfile } from '../../../hooks/use-current-profile'
import type { Deposit, MovementType, NewMovement } from '../types'
import { activeOccupation, formatLiters } from '../utils'

interface Props { sourceCode: string; onBack: () => void; onDone: (destinationContentCode: string) => void }

const steps = ['Tipo y momento', 'Origen y destino', 'Balance', 'Revisión'] as const
const today = new Date().toISOString().slice(0, 10)
const nowTime = new Date().toTimeString().slice(0, 5)

function Stepper({ current }: { current: number }) {
  return <div className="flex items-center gap-2 overflow-x-auto">{steps.map((label, index) => <div key={label} className="flex shrink-0 items-center gap-2">
    <span className={`flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-semibold ${index < current ? 'bg-[#dceadf] text-[#1f5c3a]' : index === current ? 'bg-plum text-white' : 'border border-border text-muted'}`}>
      {index < current && <Check className="size-3.5" />}{index + 1} · {label}
    </span>
    {index < steps.length - 1 && <span className="h-px w-6 bg-border" />}
  </div>)}</div>
}

export function MovementWizardPage({ sourceCode, onBack, onDone }: Props) {
  const [step, setStep] = useState(0)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [centerMembers, setCenterMembers] = useState<CenterMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<NewMovement>({ type: 'Trasiego', effectiveDate: today, effectiveTime: nowTime, responsible: '', reason: '', sourceDeposit: sourceCode, destinationDeposit: '', volumeLiters: 0, lossLiters: 0 })
  const profile = useCurrentProfile()

  useEffect(() => { cellarApi.getDeposits().then((items) => { setDeposits(items); const occupation = activeOccupation(items.find((deposit) => deposit.code === sourceCode) as Deposit); if (occupation) setForm((current) => ({ ...current, volumeLiters: occupation.volumeLiters })) }).finally(() => setLoading(false)) }, [sourceCode])

  useEffect(() => { profileApi.listCenterMembers().then(setCenterMembers).catch(() => undefined) }, [])

  useEffect(() => { if (profile) setForm((current) => (current.responsible ? current : { ...current, responsible: profile.username ?? profile.displayName })) }, [profile])

  if (loading) return <p className="p-6 text-center text-xs text-muted">Cargando datos del movimiento…</p>
  const source = deposits.find((deposit) => deposit.code === sourceCode)
  if (!source) return <div className="rounded-2xl border border-border bg-white p-6"><p className="text-sm">No se encuentra el depósito {sourceCode}.</p><button onClick={onBack} className="mt-2 text-xs font-semibold text-plum">Volver</button></div>
  const sourceOccupation = activeOccupation(source)
  if (!sourceOccupation) return <div className="rounded-2xl border border-border bg-white p-6"><p className="text-sm">{sourceCode} no tiene contenido activo para mover.</p><button onClick={onBack} className="mt-2 text-xs font-semibold text-plum">Volver</button></div>

  const destination = deposits.find((deposit) => deposit.code === form.destinationDeposit)
  const destinationOccupation = destination ? activeOccupation(destination) : undefined
  const becameMixture = form.type !== 'Salida' && Boolean(destinationOccupation)
  const withdrawn = form.volumeLiters + form.lossLiters
  const sourceFinal = sourceOccupation.volumeLiters - withdrawn
  const destinationFinal = (destinationOccupation?.volumeLiters ?? 0) + form.volumeLiters
  const balanced = sourceFinal >= 0

  const field = 'mt-1.5 min-h-10 w-full rounded-xl border border-border bg-white px-3 py-2 text-xs outline-none focus:border-[#b9899c]'
  const canAdvanceStep1 = form.effectiveDate && form.responsible.trim() && form.reason.trim()
  const canAdvanceStep2 = form.type === 'Salida' ? form.volumeLiters > 0 : Boolean(form.destinationDeposit) && form.volumeLiters > 0
  const canAdvanceStep3 = sourceFinal >= 0 && (form.type === 'Salida' || Boolean(destination))

  const handleConfirm = async () => {
    setSaving(true); setError('')
    try { const result = await cellarApi.registerMovement(form); onDone(result.destinationContentCode) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido registrar el movimiento.') }
    finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-4xl space-y-4 pb-6">
    <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-plum"><ArrowLeft className="size-4" />Volver a {sourceCode}</button>
    <header><p className="text-[11px] text-muted">Bodega / {sourceCode} / Registro de movimiento</p><h1 className="mt-1 text-[23px] font-semibold">Registrar movimiento</h1></header>
    <section className="rounded-2xl border border-border bg-white p-4 sm:p-5">
      <Stepper current={step} />

      {step === 0 && <div className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold">Tipo de movimiento *<select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as MovementType })} className={field}><option>Trasiego</option><option>Trasvase</option><option>Salida</option></select></label>
          <label className="text-xs font-semibold">Responsable *<select required value={form.responsible} onChange={(event) => setForm({ ...form, responsible: event.target.value })} className={field}><option value="">Selecciona un responsable</option>{centerMembers.map((member) => <option key={member.username} value={member.username}>{member.displayName || member.username}</option>)}</select></label>
          <label className="text-xs font-semibold">Fecha efectiva *<input required type="date" max={today} value={form.effectiveDate} onChange={(event) => setForm({ ...form, effectiveDate: event.target.value })} className={field} /></label>
          <label className="text-xs font-semibold">Hora *<input required type="time" value={form.effectiveTime} onChange={(event) => setForm({ ...form, effectiveTime: event.target.value })} className={field} /></label>
        </div>
        <label className="block text-xs font-semibold">Motivo *<textarea required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} rows={3} placeholder="Por qué se realiza este movimiento" className={field} /></label>
      </div>}

      {step === 1 && <div className="mt-5 space-y-4">
        <div className="rounded-xl bg-plum-soft p-3 text-xs text-plum">Origen: <strong className="font-mono">{sourceCode}</strong> · {sourceOccupation.contentCode} · {formatLiters(sourceOccupation.volumeLiters)} L disponibles</div>
        <div className="grid gap-3 sm:grid-cols-2">
          {form.type !== 'Salida' && <label className="text-xs font-semibold">Depósito de destino *<select required value={form.destinationDeposit} onChange={(event) => setForm({ ...form, destinationDeposit: event.target.value })} className={field}><option value="">Selecciona un depósito</option>{deposits.filter((deposit) => deposit.code !== sourceCode && deposit.status !== 'maintenance' && deposit.status !== 'cleaning').map((deposit) => <option key={deposit.code} value={deposit.code}>{deposit.code} · {activeOccupation(deposit) ? `ocupado (${activeOccupation(deposit)?.contentCode})` : 'vacío'}</option>)}</select></label>}
          <label className="text-xs font-semibold">Volumen a mover (L) *<input required type="number" min="1" max={sourceOccupation.volumeLiters} value={form.volumeLiters} onChange={(event) => setForm({ ...form, volumeLiters: Number(event.target.value) })} className={field} /></label>
          <label className="text-xs font-semibold">Merma identificada (L)<input type="number" min="0" value={form.lossLiters} onChange={(event) => setForm({ ...form, lossLiters: Number(event.target.value) })} className={field} /></label>
        </div>
        {destinationOccupation && <p className="text-[11px] text-muted">{form.destinationDeposit} ya está ocupado por {destinationOccupation.contentCode}: este movimiento se convertirá en mezcla en el paso siguiente.</p>}
      </div>}

      {step === 2 && <div className="mt-5 space-y-4">
        {becameMixture && <div className="rounded-2xl bg-[#f3e7ee] p-4"><p className="text-sm font-semibold text-plum">{form.destinationDeposit} ya está ocupado: este flujo se convierte en mezcla</p><p className="mt-1 text-[12px] text-copy">Añadir {formatLiters(form.volumeLiters)} L de {sourceOccupation.contentCode} al contenido existente de {form.destinationDeposit} crea una nueva unidad. Las dos procedencias quedan visibles en la genealogía.</p></div>}
        <div className="rounded-2xl border border-border bg-[#fdfbfc] p-4">
          <h2 className="text-sm font-semibold">Balance de volumen</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-white p-3"><div className="text-[11px] text-muted">{sourceCode} inicial</div><div className="mt-1 font-mono text-[15px]">{formatLiters(sourceOccupation.volumeLiters)} L</div></div>
            <div className="rounded-xl border border-border bg-white p-3"><div className="text-[11px] text-muted">Retirado</div><div className="mt-1 font-mono text-[15px] text-[#8e1f33]">− {formatLiters(withdrawn)} L</div></div>
            <div className="rounded-xl border border-border bg-white p-3"><div className="text-[11px] text-muted">{form.type === 'Salida' ? 'Salida' : `Aportado a ${form.destinationDeposit || 'destino'}`}</div><div className="mt-1 font-mono text-[15px] text-[#1f5c3a]">+ {formatLiters(form.volumeLiters)} L</div></div>
            <div className="rounded-xl border border-border bg-white p-3"><div className="text-[11px] text-muted">Merma identificada</div><div className="mt-1 font-mono text-[15px]">{formatLiters(form.lossLiters)} L</div></div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border p-4"><div className="text-xs font-semibold text-copy">{sourceCode} final</div><div className="mt-1 font-mono text-[18px]">{formatLiters(Math.max(0, sourceFinal))} L</div><div className="mt-1 text-[11px] text-muted">{sourceFinal <= 0 ? 'Depósito quedará vacío' : `${sourceOccupation.contentCode} permanece · misma unidad`}</div></div>
            {form.type !== 'Salida' && <div className="rounded-2xl border-[1.5px] border-[#b9899c] bg-[#fbf5f8] p-4"><div className="text-xs font-semibold text-plum">{form.destinationDeposit || 'Destino'} final</div><div className="mt-1 font-mono text-[18px]">{formatLiters(destinationFinal)} L</div><div className="mt-1 text-[11px] text-plum">{becameMixture ? 'Nueva unidad · mezcla de dos procedencias' : `${sourceOccupation.contentCode} entra sin ocupación previa`}</div></div>}
          </div>
          <div className={`mt-4 flex items-center gap-2 rounded-xl p-3 text-xs ${balanced ? 'bg-[#dceadf] text-[#1f5c3a]' : 'bg-[#f7dadf] text-[#8e1f33]'}`}><span className="size-1.5 rounded-full bg-current" />{balanced ? `Balance cuadrado: ${formatLiters(withdrawn)} L retirados = ${formatLiters(form.volumeLiters)} L aportados + ${formatLiters(form.lossLiters)} L de merma sin diferencia sin justificar.` : 'El balance no cuadra: revisa volumen y merma.'}</div>
        </div>
      </div>}

      {step === 3 && <div className="mt-5 space-y-4">
        <div className="rounded-2xl border border-border bg-[#fdfbfc] p-4"><h2 className="text-sm font-semibold">Resumen del movimiento</h2><div className="mt-3 space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-muted">Tipo</span><span>{form.type}{becameMixture ? ' (reclasificado a mezcla)' : ''}</span></div>
          <div className="flex justify-between"><span className="text-muted">Fecha efectiva</span><span className="font-mono">{form.effectiveDate} {form.effectiveTime}</span></div>
          <div className="flex justify-between"><span className="text-muted">Responsable</span><span>{form.responsible}</span></div>
          <div className="flex justify-between"><span className="text-muted">Motivo</span><span>{form.reason}</span></div>
          <div className="flex justify-between"><span className="text-muted">Origen</span><span className="font-mono">{sourceCode} · {formatLiters(withdrawn)} L retirados</span></div>
          {form.type !== 'Salida' && <div className="flex justify-between"><span className="text-muted">Destino</span><span className="font-mono">{form.destinationDeposit} · {formatLiters(form.volumeLiters)} L aportados</span></div>}
        </div></div>
        <p className="text-[11px] text-muted">Se comprobará concurrencia justo antes de confirmar.</p>
        {error && <p role="alert" className="text-xs text-[#8e1f33]">{error}</p>}
      </div>}

      <div className="mt-6 flex justify-between gap-2">
        <button type="button" disabled={step === 0} onClick={() => setStep(step - 1)} className="min-h-10 rounded-xl border border-border px-4 text-xs font-semibold disabled:opacity-40">Atrás</button>
        {step < 3
          ? <button type="button" disabled={(step === 0 && !canAdvanceStep1) || (step === 1 && !canAdvanceStep2) || (step === 2 && !canAdvanceStep3)} onClick={() => setStep(step + 1)} className="min-h-10 rounded-xl bg-plum px-4 text-xs font-semibold text-white disabled:opacity-40">Continuar</button>
          : <button type="button" disabled={saving} onClick={handleConfirm} className="min-h-10 rounded-xl bg-plum px-4 text-xs font-semibold text-white disabled:opacity-60">{saving ? 'Confirmando…' : 'Confirmar movimiento'}</button>}
      </div>
    </section>
  </div>
}
