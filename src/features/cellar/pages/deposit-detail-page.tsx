import { useEffect, useState, type FormEvent } from 'react'
import { fermentationLabels, label as stateLabel } from '../../../lib/labels'
import { ArrowLeft, ExternalLink, FileText, Pencil, Trash2, X } from 'lucide-react'
import { cellarApi } from '../services/cellar-api'
import type { Deposit, NewDeposit } from '../types'
import { activeOccupation, formatLiters, statusClass, statusLabel } from '../utils'
import { useCurrentProfile } from '../../../hooks/use-current-profile'

interface DepositDetailPageProps {
  code: string
  onBack: () => void
  onOpenLots: () => void
  onOpenContent: (code: string) => void
  onRegisterMovement: (code: string) => void
  onRegisterSample?: (code: string) => void
  onRegisterEntry?: (code: string) => void
  onOpenReport?: (code: string) => void
}

type Tab = 'Características' | 'Ocupaciones' | 'Limpieza y mantenimiento'
const tabs: Tab[] = ['Características', 'Ocupaciones', 'Limpieza y mantenimiento']

function EditDeposit({ deposit, onClose, onSaved }: { deposit: Deposit; onClose: () => void; onSaved: (deposit: Deposit) => void }) {
  const [form, setForm] = useState<Pick<NewDeposit, 'zone' | 'position' | 'capacityLiters' | 'material' | 'refrigerated'>>({ zone: deposit.zone ?? '', position: deposit.position, capacityLiters: deposit.capacityLiters, material: deposit.material, refrigerated: deposit.refrigerated })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(''); try { onSaved(await cellarApi.updateDeposit(deposit.code, form)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido guardar.') } finally { setSaving(false) } }
  return <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-labelledby="edit-deposit-title" onMouseDown={(event) => event.stopPropagation()} className="h-full w-full max-w-[420px] overflow-y-auto bg-[#fdfbfc] p-5 shadow-xl sm:p-6"><div className="flex items-center justify-between"><h2 id="edit-deposit-title" className="text-[20px] font-semibold">Editar {deposit.code}</h2><button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-plum-soft"><X className="size-4" /></button></div><p className="mt-2 text-[12px] text-muted">El volumen del contenido se cambia mediante un movimiento, no aquí.</p><form onSubmit={handleSubmit} className="mt-5 space-y-4"><p className="rounded-xl bg-plum-soft p-3 font-mono text-[12px] text-plum">{deposit.code} · {deposit.center}</p>{([['Zona', 'zone'], ['Posición', 'position']] as const).map(([label, key]) => <label key={key} className="block text-[12px] font-semibold text-copy">{label}<input required={key === 'zone'} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-border bg-white px-3 text-[13px] font-normal outline-none focus:border-[#b9899c]" /></label>)}<label className="block text-[12px] font-semibold text-copy">Capacidad útil (L)<input required type="number" min="1" value={form.capacityLiters} onChange={(event) => setForm({ ...form, capacityLiters: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded-xl border border-border bg-white px-3 text-[13px] font-normal outline-none focus:border-[#b9899c]" /></label><label className="block text-[12px] font-semibold text-copy">Material<select value={form.material} onChange={(event) => setForm({ ...form, material: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-border bg-white px-3 text-[13px] font-normal"><option>Inox</option><option>Hormigón</option><option>Madera</option></select></label><label className="flex items-center gap-2 text-[12px] text-copy"><input type="checkbox" checked={form.refrigerated} onChange={(event) => setForm({ ...form, refrigerated: event.target.checked })} />Refrigerado</label>{error && <p role="alert" className="text-[12px] text-[#8e3b4a]">{error}</p>}<button type="submit" disabled={saving} className="min-h-10 w-full rounded-xl bg-plum text-[12.5px] font-semibold text-white disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar cambios'}</button></form></section></div>
}

export function DepositDetailPage({ code, onBack, onOpenLots, onOpenContent, onRegisterMovement, onRegisterSample, onRegisterEntry, onOpenReport }: DepositDetailPageProps) {
  const [deposit, setDeposit] = useState<Deposit>()
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('Ocupaciones')
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const [clearing, setClearing] = useState(false)
  const [clearReason, setClearReason] = useState('')
  const [clearError, setClearError] = useState('')
  const [clearingBusy, setClearingBusy] = useState(false)
  const profile = useCurrentProfile()

  useEffect(() => { let mounted = true; setLoading(true); cellarApi.getDeposit(code).then((data) => { if (mounted) setDeposit(data) }).finally(() => { if (mounted) setLoading(false) }); return () => { mounted = false } }, [code])
  if (loading) return <p className="p-6 text-center text-[12px] text-muted">Cargando depósito…</p>
  if (!deposit) return <div className="rounded-2xl border border-border bg-white p-6"><p className="text-[13px]">No se encuentra el depósito {code}.</p><button type="button" onClick={onBack} className="text-[12px] font-semibold text-plum">Volver a depósitos</button></div>

  const occupation = activeOccupation(deposit)
  const occupiedLiters = occupation?.volumeLiters ?? 0
  const fill = Math.round(occupiedLiters / deposit.capacityLiters * 100)

  return <div className="space-y-4"><button type="button" onClick={onBack} className="flex items-center gap-1 text-[11.5px] font-semibold text-plum hover:underline"><ArrowLeft className="size-3.5" />Volver a depósitos</button><header className="rounded-[18px] border border-border bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h1 className="m-0 font-mono text-[22px] font-medium">{deposit.code}</h1><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClass(deposit)}`}>{statusLabel(deposit)}</span></div><p className="mt-1 text-[12px] text-muted">{deposit.zone} · posición {deposit.position || 'sin indicar'} · útil {formatLiters(deposit.capacityLiters)} L</p><p className="mt-1 text-[11.5px] text-copy">Recipiente físico. El producto almacenado tiene su propia identidad e historial.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditing(true)} className="flex min-h-9 items-center gap-1 rounded-xl border border-border px-3 text-[11.5px] font-semibold hover:bg-plum-soft"><Pencil className="size-3.5" />Editar</button>{deposit.status === 'available' ? <button type="button" onClick={onRegisterEntry ? () => onRegisterEntry(deposit.code) : onOpenLots} className="min-h-9 rounded-xl bg-plum px-3 text-[11.5px] font-semibold text-white">Registrar entrada</button> : occupation ? <><button type="button" onClick={onRegisterSample ? () => onRegisterSample(deposit.code) : () => setNotice(`Registrar muestra para ${occupation.contentCode}: vista de laboratorio pendiente.`)} className="min-h-9 rounded-xl bg-plum px-3 text-[11.5px] font-semibold text-white">Registrar muestra</button><button type="button" onClick={() => onRegisterMovement(deposit.code)} className="min-h-9 rounded-xl border border-border px-3 text-[11.5px] font-semibold">Registrar movimiento</button>{onOpenReport && <button type="button" onClick={() => onOpenReport(deposit.code)} className="flex min-h-9 items-center gap-1 rounded-xl border border-border px-3 text-[11.5px] font-semibold hover:bg-plum-soft"><FileText className="size-3.5" />Informe</button>}<button type="button" onClick={() => { setClearing((current) => !current); setClearError('') }} className="min-h-9 rounded-xl border border-[#d6a8b3] bg-white px-3 text-[11.5px] font-semibold text-[#8e1f33] hover:bg-[#f7e0e6]"><Trash2 className="mr-1 inline size-3.5" />Eliminar contenido</button></> : null}</div></div></header>{clearing && occupation && <section className="space-y-3 rounded-[18px] border border-[#d6a8b3] bg-[#fdf5f7] p-4"><div><p className="text-[12.5px] font-semibold text-[#8e1f33]">Eliminar el contenido del depósito {deposit.code}</p><p className="mt-1 text-[11.5px] text-copy">Vas a retirar {formatLiters(occupiedLiters)} L del contenido <span className="font-mono">{occupation.contentCode}</span> (lote {occupation.lotCode}). Quedará registrado como movimiento <span className="font-mono">LOSS</span> y el depósito pasará a <span className="font-semibold">PENDING_CLEANING</span>. Esta acción no se puede deshacer.</p></div><label className="block text-[12px] font-semibold text-copy">Motivo / corrección<textarea required rows={2} value={clearReason} onChange={(event) => setClearReason(event.target.value)} placeholder="p. ej. Entré el lote equivocado en E-2" className="mt-1 w-full rounded-xl border border-border bg-white p-2 text-[12px] outline-none focus:border-[#b9899c]" /></label>{clearError && <p role="alert" className="text-[12px] text-[#8e3b4a]">{clearError}</p>}<div className="flex flex-wrap gap-2"><button type="button" disabled={clearingBusy || !clearReason.trim()} onClick={async () => { setClearingBusy(true); setClearError(''); try { await cellarApi.clearContent(deposit.code, clearReason, profile?.username ?? ''); const fresh = await cellarApi.getDeposit(deposit.code); if (fresh) setDeposit(fresh); setClearing(false); setClearReason(''); setNotice(`Contenido ${occupation.contentCode} retirado. El depósito queda pendiente de limpieza.`) } catch (cause) { setClearError(cause instanceof Error ? cause.message : 'No se ha podido eliminar el contenido.') } finally { setClearingBusy(false) } }} className="min-h-10 rounded-xl bg-[#8e1f33] px-4 text-[12px] font-semibold text-white disabled:opacity-60">{clearingBusy ? 'Eliminando…' : 'Confirmar eliminación'}</button><button type="button" onClick={() => { setClearing(false); setClearReason('') }} className="min-h-10 rounded-xl border border-border px-4 text-[12px] font-semibold">Cancelar</button></div></section>}
    {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-border bg-white p-3 text-[12px] text-copy"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Cerrar aviso"><X className="size-3.5" /></button></div>}
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,1fr)]"><section className="min-w-0 rounded-[18px] border border-border bg-[#fdfbfc] p-4 sm:p-5"><div className="flex gap-1 overflow-x-auto border-b border-border" role="tablist" aria-label="Datos del depósito">{tabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`shrink-0 border-b-2 px-3 py-2.5 text-[11.5px] font-semibold ${tab === item ? 'border-plum text-plum' : 'border-transparent text-muted'}`}>{item}</button>)}</div>
      {tab === 'Características' && <div className="mt-4 grid gap-3 sm:grid-cols-2">{[['Identificador', deposit.code], ['Centro', deposit.center], ['Zona y posición', `${deposit.zone} · ${deposit.position || 'sin indicar'}`], ['Capacidad útil', `${formatLiters(deposit.capacityLiters)} L`], ['Capacidad nominal', deposit.nominalCapacityLiters ? `${formatLiters(deposit.nominalCapacityLiters)} L` : 'No indicada'], ['Material y refrigeración', `${deposit.material} · ${deposit.refrigerated ? 'refrigerado' : 'sin refrigeración'}`]].map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-white p-3"><div className="text-[11px] text-muted">{label}</div><div className="mt-1 text-[12.5px] font-semibold">{value}</div></div>)}<p className="sm:col-span-2 text-[11.5px] leading-5 text-muted">El volumen ocupado procede de los movimientos y no se edita entre estas características.</p></div>}
      {tab === 'Ocupaciones' && <div className="mt-4 space-y-2">{deposit.occupations.length === 0 ? <p className="rounded-xl bg-white p-5 text-[12px] text-muted">No hay ocupaciones registradas.</p> : deposit.occupations.map((item) => { const eliminated = item.volumeLiters === 0 && Boolean(item.exitDate); return <button type="button" key={`${item.contentCode}-${item.entryDate}`} onClick={() => onOpenContent(item.contentCode)} className={`relative grid w-full cursor-pointer grid-cols-2 gap-2 rounded-xl border p-3 text-left text-[11.5px] transition hover:border-plum hover:bg-plum-soft sm:grid-cols-[1.2fr_1fr_1fr_1fr_1fr] ${eliminated ? 'border-border bg-[#f7e0e6]/40 text-muted line-through' : 'border-border bg-white'}`}><div><span className="block text-[10px] text-muted sm:hidden">Contenido</span><span className="font-mono font-semibold">{item.contentCode}</span></div><div><span className="block text-[10px] text-muted sm:hidden">Lote</span><span className="font-mono">{item.lotCode}</span></div><div><span className="block text-[10px] text-muted sm:hidden">Entrada</span>{item.entryDate}</div><div><span className="block text-[10px] text-muted sm:hidden">Salida</span>{item.exitDate ?? <span className="font-semibold not-italic text-[#1f5c3a]">Actual</span>}</div><div><span className="block text-[10px] text-muted sm:hidden">Volumen</span><span className="not-italic">{formatLiters(item.volumeLiters)} L</span></div>{eliminated && <span className="absolute right-2 top-2 rounded-full bg-[#f7e0e6] px-2 py-0.5 text-[9.5px] font-semibold text-[#8e1f33] no-underline">Eliminada por corrección</span>}</button> })}<p className="text-[11px] text-muted">Las ocupaciones cerradas son historia y no se presentan como contenido actual.</p></div>}
      {tab === 'Limpieza y mantenimiento' && <CleaningTab deposit={deposit} onChanged={(next) => setDeposit(next)} profile={profile} />}
    </section><aside className="space-y-4">{occupation ? <section role="button" tabIndex={0} onClick={() => onOpenContent(occupation.contentCode)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpenContent(occupation.contentCode) } }} aria-label={`Abrir ficha del contenido ${occupation.contentCode}`} className="cursor-pointer rounded-[18px] border border-border bg-[#fdfbfc] p-4 sm:p-5 transition hover:border-plum hover:bg-plum-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-plum"><div className="flex items-center justify-between gap-2"><h2 className="text-[16px] font-semibold">Contenido actual</h2><span className="flex items-center gap-2"><span className="rounded-full bg-plum-soft px-2 py-1 text-[10px] font-semibold text-plum">Ocupado</span><ExternalLink className="size-3.5 text-plum" /></span></div><p className="mt-3 font-mono text-[14px] font-semibold">{occupation.contentCode}</p><p className="mt-1 text-[12px] text-muted">{occupation.category} · {occupation.lotCode}</p><p className="mt-3 font-mono text-[22px]">{formatLiters(occupiedLiters)} L</p><div className="mt-1 h-1.5 rounded-full bg-[#efe6ea]"><div className="h-full rounded-full bg-plum" style={{ width: `${Math.min(100, fill)}%` }} /></div><p className="mt-1 text-[11px] text-muted">{fill} % de capacidad útil · el llenado no indica avance fermentativo</p><div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1"><div className="rounded-xl bg-white p-3 text-[11.5px]"><div className="text-muted">Fermentación alcohólica</div><strong className="mt-1 block">{stateLabel(fermentationLabels, occupation.alcoholicState)}</strong></div><div className="rounded-xl bg-white p-3 text-[11.5px]"><div className="text-muted">Maloláctica</div><strong className="mt-1 block">{stateLabel(fermentationLabels, occupation.malolacticState)}</strong></div></div>{deposit.priority !== 'none' && <p className="mt-3 text-[11.5px] font-semibold text-[#8e1f33]">Prioridad: {statusLabel(deposit)}</p>}</section> : <section className="rounded-[18px] border border-border bg-[#fdfbfc] p-4 sm:p-5"><div className="flex items-center justify-between gap-2"><h2 className="text-[16px] font-semibold">Contenido actual</h2></div><p className="mt-3 text-[12px] leading-5 text-muted">Sin contenido actual. No se muestran como vigentes los estados del producto anterior.</p></section>}{occupation && <section className="rounded-[18px] border border-border bg-[#fdfbfc] p-4 sm:p-5"><h2 className="text-[16px] font-semibold">Últimas medidas</h2><dl className="mt-3 space-y-2 text-[11.5px]">{(deposit.code === 'DEP-014' ? [['Acidez volátil', '0,72 g/L · 14 sep'], ['pH', '3,42 · 14 sep'], ['Temperatura', '18,6 °C · hoy 07:05'], ['Azúcares reductores', 'No medido']] : [['Último control', deposit.lastControl ?? 'Sin controles'], ['Vigencia', deposit.lastControlAge ?? 'Pendiente']]).map(([label, value]) => <div key={label} className="flex justify-between gap-3 border-b border-border pb-2"><dt className="text-muted">{label}</dt><dd className="m-0 text-right font-semibold">{value}</dd></div>)}</dl></section>}</aside></div>
    {editing && <EditDeposit deposit={deposit} onClose={() => setEditing(false)} onSaved={(updated) => { setDeposit(updated); setEditing(false) }} />}
  </div>
}

function CleaningTab({ deposit, onChanged, profile }: { deposit: Deposit; onChanged: (next: Deposit) => void; profile: ReturnType<typeof useCurrentProfile> }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cleanForm, setCleanForm] = useState({ action: 'Limpieza CIP', result: 'Deposito apto', notes: '' })
  const [approved, setApproved] = useState(true)

  const refresh = async () => {
    const next = await cellarApi.getDeposit(deposit.code)
    if (next) onChanged(next)
  }

  const start = async () => {
    setBusy(true); setError(''); setNotice('')
    try { await cellarApi.startCleaning(deposit.code); setNotice('Limpieza iniciada (estado CLEANING).'); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido iniciar la limpieza.') }
    finally { setBusy(false) }
  }

  const complete = async () => {
    if (!cleanForm.action.trim() || !cleanForm.result.trim()) { setError('Completa acción y resultado.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      await cellarApi.completeCleaning(deposit.code, {
        action: cleanForm.action.trim(),
        result: cleanForm.result.trim(),
        notes: cleanForm.notes.trim() || undefined,
        approved,
      })
      setNotice(approved ? 'Limpieza aprobada: depósito liberado a AVAILABLE.' : 'Limpieza rechazada: vuelve a PENDING_CLEANING.')
      await refresh()
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido cerrar la limpieza.') }
    finally { setBusy(false) }
  }

  const status = deposit.status
  const isPending = status === 'pending_cleaning'
  const inCleaning = status === 'cleaning'

  return (
    <div className="mt-4 space-y-4">
      <section className="rounded-xl border border-border bg-white p-4 text-[12px]">
        <h3 className="text-[14px] font-semibold">Estado del depósito</h3>
        <p className="mt-1 text-muted">Estado actual: <strong className="text-ink">{statusLabel(deposit)}</strong>{isPending && ' — pendiente de iniciar la limpieza.'}{inCleaning && ' — limpieza en curso.'}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy || !isPending} onClick={start} className="min-h-9 rounded-xl bg-plum px-3 text-[12px] font-semibold text-white disabled:opacity-60">{busy ? '…' : 'Iniciar limpieza'}</button>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-white p-4 text-[12px]">
        <h3 className="text-[14px] font-semibold">Cerrar la limpieza</h3>
        <p className="mt-1 text-muted">Cuando termines, registra la actuación y decide si liberas el depósito a AVAILABLE o lo devuelves a PENDING_CLEANING para repetir.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-[12px] font-semibold text-copy">Acción<select value={cleanForm.action} onChange={(event) => setCleanForm({ ...cleanForm, action: event.target.value })} className="mt-1 h-10 w-full rounded-xl border border-border bg-white px-2 text-[12.5px]"><option>Limpieza CIP</option><option>Limpieza manual</option><option>Sanitización</option><option>Inspección visual</option></select></label>
          <label className="block text-[12px] font-semibold text-copy">Resultado<select value={cleanForm.result} onChange={(event) => setCleanForm({ ...cleanForm, result: event.target.value })} className="mt-1 h-10 w-full rounded-xl border border-border bg-white px-2 text-[12.5px]"><option>Deposito apto</option><option>Apto con observaciones</option><option>No apto</option></select></label>
          <label className="block text-[12px] font-semibold text-copy sm:col-span-2">Notas<textarea rows={2} value={cleanForm.notes} onChange={(event) => setCleanForm({ ...cleanForm, notes: event.target.value })} placeholder="Detalle de la operación" className="mt-1 w-full rounded-xl border border-border bg-white p-2 text-[12.5px]" /></label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-[12px]"><input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} />Aprobar la limpieza (liberar el depósito a AVAILABLE)</label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" disabled={busy || (!isPending && !inCleaning)} onClick={complete} className="min-h-10 rounded-xl bg-plum px-4 text-[12px] font-semibold text-white disabled:opacity-60">{busy ? 'Guardando…' : approved ? 'Aprobar y liberar' : 'Devolver a PENDING_CLEANING'}</button>
        </div>
        {!isPending && !inCleaning && <p className="mt-3 text-muted">Disponible cuando el depósito esté pendiente de limpieza (tras vaciarlo).</p>}
      </section>

      <section className="rounded-xl border border-border bg-white p-4 text-[12px]">
        <h3 className="text-[14px] font-semibold">Historial de actuaciones</h3>
        {deposit.cleaningHistory.length === 0 ? <p className="mt-2 rounded-xl bg-field p-3 text-muted">Sin actuaciones registradas.</p> : <ul className="mt-2 space-y-2">{deposit.cleaningHistory.map((item, index) => <li key={`${item.date}-${item.action}-${index}`} className="rounded-xl border border-border p-3"><div className="flex justify-between gap-2"><strong>{item.action}</strong><span className="text-muted">{item.date}</span></div><p className="m-0 mt-1 text-muted">{item.responsible} · {item.result}</p></li>)}</ul>}
      </section>

      {error && <p role="alert" className="rounded-xl bg-[#f7e0e6] p-3 text-[12px] text-[#8e1f33]">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-[#dceadf] p-3 text-[12px] text-[#1f5c3a]">{notice}</p>}
    </div>
  )
}
