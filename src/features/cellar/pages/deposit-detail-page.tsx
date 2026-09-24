import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { formatDate } from '../../../lib/format'
import { ArrowLeft, ArrowLeftRight, ChevronDown, FlaskConical, LogIn, ExternalLink, FileText, MoreHorizontal, Pencil, Trash2, X } from 'lucide-react'
import { cellarApi } from '../services/cellar-api'
import type { Deposit, NewDeposit } from '../types'
import { activeOccupation, formatLiters, statusClass, statusLabel } from '../utils'
import { useCurrentProfile } from '../../../hooks/use-current-profile'
import { StatTile } from '../../../components/ui/stat-tile'
import { ActionTile, actionTileClass } from '../../../components/ui/action-tile'
import { formatAge, statusClass as readingStatusClass } from '../../tracking/utils'
import { LocationBadge } from '../components/deposit-badges'
import { TankLevel } from '../components/deposit-detail/tank-level'
import { WineTypePicker } from '../components/deposit-detail/wine-type-picker'
import { KeyReadings, TemplateReadings } from '../components/deposit-detail/key-readings'
import { EvolutionCard } from '../components/deposit-detail/evolution-card'
import { ActivityFeed } from '../components/deposit-detail/activity-feed'
import { defaultChartParameters, keyReadings, overallStatus, phaseLabel, phaseOf, phaseParameters, readingsByTemplate, useContentInsights } from '../components/deposit-detail/content-insights'
import { PhaseCard } from '../components/deposit-detail/phase-card'
import { useAssistantView } from '../../assistant/view-context'
import { depositDetailView } from '../assistant-views'

interface DepositDetailPageProps {
  code: string
  onBack: () => void
  onOpenLots: () => void
  onOpenContent: (code: string) => void
  onRegisterMovement: (code: string) => void
  onRegisterSample?: (code: string) => void
  onRegisterEntry?: (code: string) => void
  onOpenReport?: (code: string) => void
  onOpenTracking?: (contentCode: string) => void
  /** Text of the back link (the page it goes back to). */
  backLabel?: string
}

function EditDeposit({ deposit, onClose, onSaved }: { deposit: Deposit; onClose: () => void; onSaved: (deposit: Deposit) => void }) {
  const [form, setForm] = useState<Pick<NewDeposit, 'zone' | 'position' | 'capacityLiters' | 'material' | 'refrigerated'>>({ zone: deposit.zone ?? '', position: deposit.position, capacityLiters: deposit.capacityLiters, material: deposit.material, refrigerated: deposit.refrigerated })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); setSaving(true); setError(''); try { onSaved(await cellarApi.updateDeposit(deposit.code, form)) } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido guardar.') } finally { setSaving(false) } }
  return <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-labelledby="edit-deposit-title" onMouseDown={(event) => event.stopPropagation()} className="h-full w-full max-w-[420px] overflow-y-auto bg-[#fdfbfc] p-5 shadow-xl sm:p-6"><div className="flex items-center justify-between"><h2 id="edit-deposit-title" className="text-[20px] font-semibold">Editar {deposit.code}</h2><button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-2 hover:bg-plum-soft"><X className="size-4" /></button></div><p className="mt-2 text-[12px] text-muted">El volumen del contenido se cambia mediante un movimiento, no aquí.</p><form onSubmit={handleSubmit} className="mt-5 space-y-4"><p className="rounded-xl bg-plum-soft p-3 font-mono text-[12px] text-plum">{deposit.code} · {deposit.center}</p>{([['Zona', 'zone'], ['Posición', 'position']] as const).map(([label, key]) => <label key={key} className="block text-[12px] font-semibold text-copy">{label}<input required={key === 'zone'} value={form[key]} onChange={(event) => setForm({ ...form, [key]: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-border bg-white px-3 text-[13px] font-normal outline-none focus:border-[#b9899c]" /></label>)}<label className="block text-[12px] font-semibold text-copy">Capacidad útil (L)<input required type="number" min="1" value={form.capacityLiters} onChange={(event) => setForm({ ...form, capacityLiters: Number(event.target.value) })} className="mt-1.5 h-10 w-full rounded-xl border border-border bg-white px-3 text-[13px] font-normal outline-none focus:border-[#b9899c]" /></label><label className="block text-[12px] font-semibold text-copy">Material<select value={form.material} onChange={(event) => setForm({ ...form, material: event.target.value })} className="mt-1.5 h-10 w-full rounded-xl border border-border bg-white px-3 text-[13px] font-normal"><option>Inox</option><option>Hormigón</option><option>Madera</option></select></label><label className="flex items-center gap-2 text-[12px] text-copy"><input type="checkbox" checked={form.refrigerated} onChange={(event) => setForm({ ...form, refrigerated: event.target.checked })} />Refrigerado</label>{error && <p role="alert" className="text-[12px] text-[#8e3b4a]">{error}</p>}<button type="submit" disabled={saving} className="min-h-10 w-full rounded-xl bg-plum text-[12.5px] font-semibold text-white disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar cambios'}</button></form></section></div>
}

const overallText = { OK: 'En rango', WARN: 'Aviso', CRIT: 'Crítico' } as const


function Collapsible({ title, count, defaultOpen = false, children }: { title: string; count?: number; defaultOpen?: boolean; children: ReactNode }) {
  return <details open={defaultOpen} className="group rounded-[18px] border border-border bg-white [&_summary::-webkit-details-marker]:hidden"><summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3.5 text-[13px] font-semibold sm:px-5">{title}{count !== undefined && <span className="ml-1.5 font-mono text-[11px] font-normal text-muted">{count}</span>}<ChevronDown className="ml-auto size-4 text-muted transition group-open:rotate-180" aria-hidden="true" /></summary><div className="border-t border-border px-4 pb-4 pt-3 sm:px-5">{children}</div></details>
}

function ActionsMenu({ items, tile = false }: { items: { label: string; icon: typeof Pencil; onClick: () => void; danger?: boolean }[]; tile?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onPointer = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false) }
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onPointer); document.removeEventListener('keydown', onKey) }
  }, [open])
  return <div ref={ref} className="relative">{tile ? <button type="button" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} className={`${actionTileClass} w-full border-border bg-white text-copy active:bg-plum-soft`}><MoreHorizontal className="size-5" aria-hidden="true" />Más</button> : <button type="button" onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open} aria-label="Más acciones" className="flex size-9 items-center justify-center rounded-xl border border-border bg-white text-copy hover:bg-plum-soft"><MoreHorizontal className="size-4" /></button>}{open && <div role="menu" className="absolute right-0 top-full z-30 mt-2 w-52 rounded-2xl border border-border bg-white p-1.5 shadow-[0_12px_32px_rgba(46,38,42,0.14)]">{items.map((item) => { const Icon = item.icon; return <button key={item.label} type="button" role="menuitem" onClick={() => { setOpen(false); item.onClick() }} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-[12.5px] font-medium ${item.danger ? 'text-[#8e1f33] hover:bg-[#fdf0f3]' : 'text-ink hover:bg-[#f7f1f4]'}`}><Icon className="size-4" aria-hidden="true" />{item.label}</button> })}</div>}</div>
}

export function DepositDetailPage({ code, onBack, onOpenLots, onOpenContent, onRegisterMovement, onRegisterSample, onRegisterEntry, onOpenReport, onOpenTracking, backLabel = 'Volver a depósitos' }: DepositDetailPageProps) {
  const [deposit, setDeposit] = useState<Deposit>()
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const [clearing, setClearing] = useState(false)
  const [clearReason, setClearReason] = useState('')
  const [clearError, setClearError] = useState('')
  const [clearingBusy, setClearingBusy] = useState(false)
  const [version, setVersion] = useState(0)
  const profile = useCurrentProfile()

  useEffect(() => { let mounted = true; setLoading(true); cellarApi.getDeposit(code).then((data) => { if (mounted) setDeposit(data) }).finally(() => { if (mounted) setLoading(false) }); return () => { mounted = false } }, [code])
  const occupation = deposit ? activeOccupation(deposit) : undefined
  const insights = useContentInsights(occupation?.contentCode, occupation?.entryDate, version)
  // What this page shows, for the assistant ("¿cómo ves este depósito?").
  useAssistantView(deposit && !insights.loading ? depositDetailView(deposit, insights) : null)

  if (loading) return <p className="p-6 text-center text-[12px] text-muted">Cargando depósito…</p>
  if (!deposit) return <div className="rounded-2xl border border-border bg-white p-6"><p className="text-[13px]">No se encuentra el depósito {code}.</p><button type="button" onClick={onBack} className="text-[12px] font-semibold text-plum">Volver a depósitos</button></div>

  const reload = (message?: string) => { if (message) setNotice(message); cellarApi.getDeposit(code).then((data) => { if (data) setDeposit(data) }); setVersion((current) => current + 1) }
  const occupiedLiters = occupation?.volumeLiters ?? 0
  const fill = Math.round(occupiedLiters / deposit.capacityLiters * 100)
  const parameters = occupation ? phaseParameters(insights, occupation) : []
  const phaseName = insights.phase?.name ?? (occupation ? phaseLabel[phaseOf(occupation)] : '')
  const readings = occupation ? keyReadings(insights, parameters) : []
  const overall = overallStatus(readings, insights.latest)
  const lastDays = insights.latest?.readings.length ? Math.min(...insights.latest.readings.map((reading) => reading.daysAgo)) : null
  const openSamples = insights.samples.filter((sample) => sample.status !== 'Validado' && sample.status !== 'Invalidado').length
  const history = deposit.occupations.filter((item) => item !== occupation)
  const lastCleaning = deposit.cleaningHistory[0]
  const needsCleaning = deposit.status === 'pending_cleaning' || deposit.status === 'cleaning'
  const registerSample = () => (onRegisterSample ? onRegisterSample(deposit.code) : setNotice(`Registrar muestra para ${occupation?.contentCode}: vista de laboratorio pendiente.`))
  const registerEntry = () => (onRegisterEntry ? onRegisterEntry(deposit.code) : onOpenLots())
  const menu = [
    { label: 'Editar depósito', icon: Pencil, onClick: () => setEditing(true) },
    ...(onOpenReport ? [{ label: 'Informe', icon: FileText, onClick: () => onOpenReport(deposit.code) }] : []),
    ...(occupation ? [{ label: 'Ficha del contenido', icon: ExternalLink, onClick: () => onOpenContent(occupation.contentCode) }, { label: 'Eliminar contenido', icon: Trash2, danger: true, onClick: () => { setClearing(true); setClearError('') } }] : []),
  ]

  const technical = <dl className="grid gap-x-6 gap-y-2.5 text-[12px] sm:grid-cols-2">{[['Centro', deposit.center], ['Zona y posición', `${deposit.zone ?? '—'} · ${deposit.position || 'sin indicar'}`], ['Capacidad útil', `${formatLiters(deposit.capacityLiters)} L`], ['Capacidad nominal', deposit.nominalCapacityLiters ? `${formatLiters(deposit.nominalCapacityLiters)} L` : 'No indicada'], ['Material', deposit.material || '—'], ['Refrigeración', deposit.refrigerated ? 'Refrigerado' : 'Sin refrigeración']].map(([label, value]) => <div key={label} className="flex justify-between gap-3 border-b border-border pb-2 last:border-0 sm:[&:nth-last-child(2)]:border-0"><dt className="text-muted">{label}</dt><dd className="m-0 text-right font-medium text-ink">{value}</dd></div>)}</dl>
  const occupationsList = history.length === 0 ? <p className="text-[12px] text-muted">Sin ocupaciones anteriores.</p> : <ul className="divide-y divide-border">{history.map((item) => { const eliminated = item.volumeLiters === 0 && Boolean(item.exitDate); return <li key={`${item.contentCode}-${item.entryDate}`}><button type="button" onClick={() => onOpenContent(item.contentCode)} className="flex w-full items-center gap-3 py-2 text-left text-[12px] hover:text-plum"><span className={`font-mono font-semibold ${eliminated ? 'text-muted line-through' : ''}`}>{item.contentCode}</span><span className="text-muted">{item.category ?? '—'} · {item.lotCode}</span><span className="ml-auto whitespace-nowrap text-[11px] text-muted">{formatDate(item.entryDate)} → {formatDate(item.exitDate)}</span></button></li> })}</ul>

  return <div className="space-y-4">
    <button type="button" onClick={onBack} className="flex items-center gap-1 text-[11.5px] font-semibold text-plum hover:underline"><ArrowLeft className="size-3.5" />{backLabel}</button>

    <header className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] border border-border bg-white p-4 sm:p-5">
      <TankLevel percent={fill} category={occupation?.category} className="h-[72px] w-16 shrink-0 sm:h-24 sm:w-[86px]" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="m-0 mr-1 font-mono text-[22px] font-medium leading-none sm:text-[26px]">{deposit.code}</h1>
          <LocationBadge zone={deposit.zone} />
          {occupation && <WineTypePicker contentCode={occupation.contentCode} category={occupation.category} onChanged={reload} />}
          {occupation && overall !== 'NONE' && <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${readingStatusClass[overall]}`}>{overallText[overall]}</span>}
          {(!occupation || deposit.priority !== 'none') && <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${statusClass(deposit)}`}>{statusLabel(deposit)}</span>}
        </div>
        <p className="mt-2 text-[12px] text-muted">{occupation ? <><button type="button" onClick={() => onOpenContent(occupation.contentCode)} className="font-mono font-semibold text-plum hover:underline">{occupation.contentCode}</button> · lote <span className="font-mono">{occupation.lotCode}</span> · desde {formatDate(occupation.entryDate)}</> : 'Sin contenido'} · {deposit.material} · {formatLiters(deposit.capacityLiters)} L útiles</p>
      </div>
      {/* Desktop: regular buttons. */}
      <div className="hidden items-center gap-2 sm:flex">
        {occupation ? <>
          <button type="button" onClick={registerSample} className="h-9 whitespace-nowrap rounded-xl bg-plum px-3.5 text-[12px] font-semibold text-white hover:bg-plum-dark">Registrar muestra</button>
          <button type="button" onClick={() => onRegisterMovement(deposit.code)} className="h-9 rounded-xl border border-border bg-white px-3.5 text-[12px] font-semibold hover:bg-plum-soft">Movimiento</button>
        </> : deposit.status === 'available' && <button type="button" onClick={registerEntry} className="h-9 rounded-xl bg-plum px-3.5 text-[12px] font-semibold text-white hover:bg-plum-dark">Registrar entrada</button>}
        <ActionsMenu items={menu} />
      </div>
      {/* Mobile: full-width row of thumb-sized tiles. */}
      <div className="grid w-full grid-cols-3 gap-2 sm:hidden">
        {occupation ? <>
          <ActionTile icon={FlaskConical} label="Muestra" primary onClick={registerSample} />
          <ActionTile icon={ArrowLeftRight} label="Movimiento" onClick={() => onRegisterMovement(deposit.code)} />
        </> : deposit.status === 'available' ? <ActionTile icon={LogIn} label="Registrar entrada" primary className="col-span-2" onClick={registerEntry} /> : <span className="col-span-2" />}
        <ActionsMenu items={menu} tile />
      </div>
    </header>

    {clearing && occupation && <section className="space-y-3 rounded-[18px] border border-[#d6a8b3] bg-[#fdf5f7] p-4"><div><p className="text-[12.5px] font-semibold text-[#8e1f33]">Eliminar el contenido del depósito {deposit.code}</p><p className="mt-1 text-[11.5px] text-copy">Vas a retirar {formatLiters(occupiedLiters)} L del contenido <span className="font-mono">{occupation.contentCode}</span> (lote {occupation.lotCode}). Quedará registrado como movimiento <span className="font-mono">LOSS</span> y el depósito pasará a pendiente de limpieza. Esta acción no se puede deshacer.</p></div><label className="block text-[12px] font-semibold text-copy">Motivo / corrección<textarea required rows={2} value={clearReason} onChange={(event) => setClearReason(event.target.value)} placeholder="p. ej. Entré el lote equivocado en E-2" className="mt-1 w-full rounded-xl border border-border bg-white p-2 text-[12px] outline-none focus:border-[#b9899c]" /></label>{clearError && <p role="alert" className="text-[12px] text-[#8e3b4a]">{clearError}</p>}<div className="flex flex-wrap gap-2"><button type="button" disabled={clearingBusy || !clearReason.trim()} onClick={async () => { setClearingBusy(true); setClearError(''); try { await cellarApi.clearContent(deposit.code, clearReason, profile?.username ?? ''); setClearing(false); setClearReason(''); reload(`Contenido ${occupation.contentCode} retirado. El depósito queda pendiente de limpieza.`) } catch (cause) { setClearError(cause instanceof Error ? cause.message : 'No se ha podido eliminar el contenido.') } finally { setClearingBusy(false) } }} className="min-h-10 rounded-xl bg-[#8e1f33] px-4 text-[12px] font-semibold text-white disabled:opacity-60">{clearingBusy ? 'Eliminando…' : 'Confirmar eliminación'}</button><button type="button" onClick={() => { setClearing(false); setClearReason('') }} className="min-h-10 rounded-xl border border-border px-4 text-[12px] font-semibold">Cancelar</button></div></section>}
    {notice && <div role="status" className="flex items-start justify-between gap-3 rounded-xl border border-border bg-white p-3 text-[12px] text-copy"><span>{notice}</span><button type="button" onClick={() => setNotice('')} aria-label="Cerrar aviso"><X className="size-3.5" /></button></div>}

    {occupation ? <>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatTile label="Volumen" value={`${formatLiters(occupiedLiters)} L`} hint={`${fill} % de la capacidad útil`} />
        <PhaseCard contentCode={occupation.contentCode} current={insights.current} phases={insights.phases} occupation={occupation} loading={insights.loading} onChanged={reload} />
        <StatTile label="Último análisis" value={insights.loading ? '…' : formatAge(lastDays)} hint={openSamples ? `${openSamples} muestra${openSamples === 1 ? '' : 's'} abierta${openSamples === 1 ? '' : 's'}` : 'Sin muestras abiertas'} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <div className="min-w-0 space-y-4">
          <EvolutionCard series={insights.series} events={insights.events} defaults={defaultChartParameters(insights, parameters)} recommended={parameters} onOpenTracking={onOpenTracking ? () => onOpenTracking(occupation.contentCode) : undefined} />
          <section className="rounded-[18px] border border-border bg-white p-4 sm:p-5"><div className="mb-3 flex items-baseline justify-between gap-2"><h2 className="text-[15px] font-semibold">Lecturas clave</h2><span className="text-[11px] text-muted">{phaseName}</span></div>{insights.loading ? <p className="text-[12px] text-muted">Cargando lecturas…</p> : <><KeyReadings readings={readings} /><TemplateReadings groups={readingsByTemplate(insights, 30)} days={30} /></>}</section>
        </div>
        <div className="min-w-0 space-y-4">
          <ActivityFeed deposit={deposit} events={insights.events} alerts={insights.alerts} samples={insights.samples} />
          <Collapsible title="Ficha técnica">{technical}</Collapsible>
          <Collapsible title="Ocupaciones anteriores" count={history.length}>{occupationsList}</Collapsible>
          <Collapsible title="Limpieza y mantenimiento" count={deposit.cleaningHistory.length}><CleaningTab deposit={deposit} onChanged={setDeposit} profile={profile} /></Collapsible>
        </div>
      </div>
    </> : <>
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
        <StatTile label="Estado" value={statusLabel(deposit)} />
        <StatTile label="Capacidad útil" value={`${formatLiters(deposit.capacityLiters)} L`} hint={deposit.refrigerated ? 'Refrigerado' : 'Sin refrigeración'} />
        <StatTile label="Última limpieza" value={lastCleaning ? formatDate(lastCleaning.date) : '—'} hint={lastCleaning?.result} />
        <StatTile label="Último contenido" value={history[0] ? history[0].contentCode : '—'} hint={history[0] ? `${history[0].category ?? '—'} · salió ${formatDate(history[0].exitDate)}` : undefined} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)]">
        <div className="min-w-0 space-y-4">
          {needsCleaning ? <section className="rounded-[18px] border border-border bg-white p-4 sm:p-5"><h2 className="text-[15px] font-semibold">Limpieza y mantenimiento</h2><CleaningTab deposit={deposit} onChanged={setDeposit} profile={profile} /></section>
            : <section className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border border-border bg-white p-5"><div><h2 className="text-[15px] font-semibold">{deposit.status === 'available' ? 'Listo para una entrada' : statusLabel(deposit)}</h2><p className="mt-1 text-[12px] text-muted">{deposit.status === 'available' ? 'El depósito está vacío y limpio. No se muestran como vigentes los estados del producto anterior.' : 'El depósito no admite entradas en su estado actual.'}</p></div>{deposit.status === 'available' && <button type="button" onClick={onRegisterEntry ? () => onRegisterEntry(deposit.code) : onOpenLots} className="h-9 rounded-xl bg-plum px-3.5 text-[12px] font-semibold text-white hover:bg-plum-dark">Registrar entrada</button>}</section>}
          <section className="rounded-[18px] border border-border bg-white p-4 sm:p-5"><h2 className="mb-2 text-[15px] font-semibold">Ocupaciones anteriores</h2>{occupationsList}</section>
        </div>
        <div className="min-w-0 space-y-4">
          <ActivityFeed deposit={deposit} events={[]} alerts={[]} samples={[]} />
          <Collapsible title="Ficha técnica" defaultOpen>{technical}</Collapsible>
          {!needsCleaning && <Collapsible title="Limpieza y mantenimiento" count={deposit.cleaningHistory.length}><CleaningTab deposit={deposit} onChanged={setDeposit} profile={profile} /></Collapsible>}
        </div>
      </div>
    </>}
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
