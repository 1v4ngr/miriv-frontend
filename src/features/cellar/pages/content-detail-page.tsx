import { ContentWatchPanel } from '../../tracking/components/content-watch-panel'
import { ToWineDialog, isMust } from '../components/to-wine-dialog'
import { useCan } from '../../../hooks/use-permissions'
import { catalogApi, type CatalogItem } from '../../../services/catalog-api'
import { ContentAnalyticStatus } from '../../tracking/components/content-analytic-status'
import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, Beaker, CheckCircle2, Clock3, Wine, X } from 'lucide-react'
import { contentApi, type ContentRecord, type ReviewStateInput } from '../services/content-api'
import { formatLiters } from '../utils'
import { label as localize, fermentationLabels, fermentationMixtureStateLabels, intentLabels } from '../../../lib/labels'
import { formatRelative } from '../../../lib/format'

type Tab = 'Resumen' | 'Analíticas' | 'Evolución' | 'Actividad' | 'Plan' | 'Trazabilidad'
const tabs: Tab[] = ['Resumen', 'Analíticas', 'Evolución', 'Actividad', 'Plan', 'Trazabilidad']

interface Props {
  /** Opens the must-to-wine dialog on arrival (link from the finished-fermentation alert). */
  openToWine?: boolean
  code: string; onBack: () => void; onOpenDeposit: (code: string) => void; onOpenLot: (code: string) => void; onOpenLaboratory: (code?: string) => void; onOpenTracking: (code: string) => void }

export function ContentDetailPage({ code, openToWine = false, onBack, onOpenDeposit, onOpenLot, onOpenLaboratory, onOpenTracking }: Props) {
  const canConfirmState = useCan('STATE_CONFIRM')
  const [toWine, setToWine] = useState(openToWine)
  const [content, setContent] = useState<ContentRecord>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('Resumen')
  const [reviewing, setReviewing] = useState(false)
  const [notice, setNotice] = useState('')
  const load = () => { setLoading(true); contentApi.getContent(code).then(setContent).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se ha podido cargar el contenido.')).finally(() => setLoading(false)) }
  useEffect(load, [code])
  if (loading) return <p className="p-6 text-center text-sm text-muted">Cargando contenido…</p>
  if (!content) return <div className="rounded-2xl border border-border bg-white p-6 text-sm">{error || `No se encuentra el contenido ${code}.`} <button onClick={onBack} className="ml-2 text-plum underline">Volver</button></div>

  const { occupation, deposit, lot, samples } = content
  const latest = samples[0]
  return <div className="min-w-0 space-y-4 pb-4">
    <button type="button" onClick={() => onOpenDeposit(deposit.code)} className="flex items-center gap-1 text-xs font-semibold text-plum"><ArrowLeft className="size-4" />Volver a {deposit.code}</button>
    <header className="rounded-2xl border border-border bg-white p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0"><p className="text-[11px] text-muted">Bodega / Contenidos / {code}</p><div className="mt-2 flex flex-wrap items-center gap-2"><h1 className="font-mono text-[23px] font-semibold">{code}</h1>{occupation.category && <span className="rounded-full bg-plum-soft px-2.5 py-1 text-[11px] font-semibold text-plum">{occupation.category}</span>}{!content.active && <span className="rounded-full bg-[#efeff5] px-2.5 py-1 text-[11px]">Histórico</span>}</div><p className="mt-1 text-xs text-muted"><button onClick={() => onOpenLot(occupation.lotCode)} className="font-mono text-plum underline">{occupation.lotCode}</button> · <button onClick={() => onOpenDeposit(deposit.code)} className="font-mono text-plum underline">{deposit.code}</button> · {formatLiters(occupation.volumeLiters)} L · {lot?.campaign ?? '—'}</p><p className="mt-1 text-xs text-copy">Plan: {content.plan ?? 'Sin plan asignado'}</p></div><div className="flex flex-wrap gap-2">{content.active && <button onClick={() => setReviewing(true)} className="min-h-9 rounded-xl border border-border px-3 text-xs font-semibold">Revisar estado</button>}<button onClick={() => onOpenLaboratory(code)} className="min-h-9 rounded-xl bg-plum px-3 text-xs font-semibold text-white">Ver laboratorio</button></div></div></header>
    {content.active && isMust(occupation.category) && canConfirmState && (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-plum/30 bg-plum-soft p-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-plum">{content.alcoholic.confirmation === 'FINISHED' ? 'La fermentación está terminada y sigue como mosto' : 'Este depósito tiene mosto'}</p>
          <p className="mt-0.5 text-xs text-copy">Al terminar la fermentación, pásalo a vino: los siguientes análisis pedirán los parámetros de vino.</p>
        </div>
        <button type="button" onClick={() => setToWine(true)} className="flex min-h-10 items-center gap-1.5 rounded-xl bg-plum px-4 text-xs font-semibold text-white hover:bg-plum-dark"><Wine className="size-4" />Pasar a vino</button>
      </section>
    )}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><StateCard title="Fermentación alcohólica" estimate={content.alcoholic.estimate} confirmation={content.alcoholic.confirmation} date={content.alcoholic.date} evidenceLabel="Actividad estimada" /><StateCard title="Maloláctica" estimate={content.malolactic.estimate} confirmation={content.malolactic.confirmation} date={content.malolactic.date} evidenceLabel="Estado observado" note={content.malolactic.intention} /><div className="rounded-2xl border border-border bg-white p-4"><p className="text-[11px] font-semibold text-muted">Vigencia de los datos</p><p className="mt-2 text-[14px] font-semibold">{deposit.priority === 'overdue' ? 'Control vencido' : deposit.lastControlAge ?? 'Sin control reciente'}</p><p className="mt-1 text-xs text-muted">{deposit.priority === 'critical' ? 'Incidencia crítica activa' : 'Revisar próxima toma'}</p></div></div>
    <div className="overflow-x-auto border-b border-border" role="tablist" aria-label="Secciones del contenido">{tabs.map((item) => <button key={item} type="button" role="tab" aria-selected={tab === item} onClick={() => setTab(item)} className={`shrink-0 border-b-2 px-3 py-3 text-xs font-semibold ${tab === item ? 'border-plum text-plum' : 'border-transparent text-muted'}`}>{item}</button>)}</div>
    {tab === 'Resumen' && <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(250px,1fr)]"><div className="space-y-4"><ContentAnalyticStatus code={code} onOpenTracking={onOpenTracking} /><section className="rounded-2xl border border-border bg-white p-4"><h2 className="text-sm font-semibold">Últimos parámetros</h2><p className="mt-1 text-[11px] text-muted">Una muestra parcial no actualiza la fecha de todos los parámetros.</p><div className="mt-3 space-y-2">{(latest?.results ?? []).map((result) => <div key={result.parameter} className="flex flex-wrap justify-between gap-2 border-b border-border pb-2 text-xs"><span>{result.parameter}</span><span className="font-semibold">{result.value} {result.unit} · {result.validity}</span></div>)}<div className="flex justify-between gap-2 text-xs"><span>Azúcares reductores</span><span className="text-muted">{latest?.results.some((result) => result.parameter === 'Azúcares reductores') ? 'Medido en muestra anterior' : 'No medido en la última muestra'}</span></div></div></section></div><aside className="space-y-4"><section className="rounded-2xl border border-border bg-white p-4"><h2 className="text-sm font-semibold">Próxima tarea</h2><p className="mt-2 text-xs">Analítica de control completa</p><p className="mt-1 text-[11px] text-muted">{deposit.priority === 'overdue' ? 'Control vencido' : 'Pendiente de planificación'}</p></section><section className="rounded-2xl border border-border bg-white p-4"><h2 className="text-sm font-semibold">Antecedentes</h2><p className="mt-2 text-xs text-muted">La unidad conserva su propia serie analítica. Las curvas de unidades anteriores no se unen a esta.</p><button onClick={() => setTab('Trazabilidad')} className="mt-3 text-xs font-semibold text-plum">Ver trazabilidad <ArrowRight className="inline size-3" /></button></section></aside></div>}
    {tab === 'Analíticas' && <section className="rounded-2xl border border-border bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-sm font-semibold">Analíticas de {code}</h2><button onClick={() => onOpenLaboratory(code)} className="text-xs font-semibold text-plum">Abrir bandeja <ArrowRight className="inline size-3" /></button></div>{samples.length ? samples.map((sample) => <button key={sample.code} onClick={() => onOpenLaboratory(code)} className="mt-3 flex w-full flex-wrap justify-between gap-2 rounded-xl border border-border p-3 text-left text-xs hover:bg-plum-soft"><span className="font-mono font-semibold">{sample.code}</span><span>{sample.takenAt}</span><span>{sample.completed}/{sample.required} · {sample.status}</span></button>) : <p className="mt-4 text-xs text-muted">Todavía no hay analíticas para esta unidad.</p>}</section>}
    {tab === 'Evolución' && <div><section className="rounded-2xl border border-border bg-white p-4"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-sm font-semibold">Evolución analítica</h2><button onClick={() => onOpenTracking(code)} className="text-xs font-semibold text-plum">Abrir curvas <ArrowRight className="inline size-3" /></button></div><p className="mt-2 text-xs text-muted">{samples.length < 2 ? 'Se necesitan al menos dos mediciones comparables para una tendencia.' : 'Serie de muestras de esta unidad. Las mediciones provisionales se identifican por separado.'}</p><div className="mt-4 space-y-2">{samples.map((sample) => <div key={sample.code} className="flex flex-wrap justify-between gap-2 rounded-xl bg-field p-3 text-xs"><span>{sample.takenAt}</span><span>{sample.results.map((result) => `${result.parameter}: ${result.value} ${result.unit}`).join(' · ')}</span></div>)}</div></section><ContentWatchPanel code={code} /></div>}
    {tab === 'Actividad' && <section className="rounded-2xl border border-border bg-white p-4"><h2 className="text-sm font-semibold">Actividad y ocupaciones</h2><p className="mt-3 text-xs">Entrada en {deposit.code}: {occupation.entryDate} · {formatLiters(occupation.volumeLiters)} L</p>{occupation.exitDate && <p className="mt-2 text-xs">Salida: {occupation.exitDate}</p>}<p className="mt-3 text-xs text-muted">Los movimientos detallados se incorporarán en UI14–UI15.</p></section>}
    {tab === 'Plan' && <section className="rounded-2xl border border-border bg-white p-4"><h2 className="text-sm font-semibold">{content.plan}</h2><p className="mt-2 text-xs">Intención maloláctica: {content.malolactic.intention}</p><p className="mt-2 text-xs text-muted">Los objetivos y versiones del plan se gestionarán en UI21.</p></section>}
    {tab === 'Trazabilidad' && <section className="rounded-2xl border border-border bg-white p-4"><h2 className="text-sm font-semibold">Trazabilidad</h2><p className="mt-2 text-xs">Lote {occupation.lotCode} · unidad {code} · {deposit.code}</p><button onClick={() => onOpenLot(occupation.lotCode)} className="mt-3 text-xs font-semibold text-plum">Abrir genealogía del lote <ArrowRight className="inline size-3" /></button></section>}
    {notice && <p role="status" className="rounded-xl bg-[#dceadf] p-3 text-xs text-[#1f5c3a]">{notice}</p>}
    {reviewing && <ReviewDialog content={content} onClose={() => setReviewing(false)} onSaved={() => { setReviewing(false); setNotice('Estado confirmado.'); load() }} />}
    {toWine && <ToWineDialog content={content} onClose={() => setToWine(false)} onDone={(message) => { setToWine(false); setNotice(message); load() }} />}
  </div>
}

function StateCard({ title, estimate, confirmation, date, evidenceLabel, note }: { title: string; estimate: string | null; confirmation: string | null; date: string | null; evidenceLabel: string; note?: string | null }) {
  // F2-03: estimate/confirmation/intention are now stable codes on the wire (NOT_EVALUATED,
  // PENDING_DECISION, ...). Fall back to the raw confirmation text when the server still
  // returns one of the enologist decisions from the existing dialog.
  const estimateLabel = estimate ? (fermentationMixtureStateLabels[estimate] ?? localize(fermentationLabels, estimate, '—')) : '—'
  const confirmationLabel = confirmation ? (fermentationMixtureStateLabels[confirmation] ?? localize(fermentationLabels, confirmation, '—')) : '—'
  const intentionLabel = note ? localize(intentLabels, note, note) : null
  const dateLabel = date ? formatRelative(date) : 'Sin medición reciente'
  return <section className="rounded-2xl border border-border bg-white p-4"><h2 className="text-[11px] font-semibold text-muted">{title}</h2><p className="mt-2 text-sm font-semibold">{estimateLabel}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted"><Beaker className="size-3.5" />{evidenceLabel} · {dateLabel}</p><p className="mt-2 flex items-center gap-1 text-xs"><CheckCircle2 className="size-3.5 text-plum" />Confirmación: {confirmationLabel}</p>{intentionLabel && <p className="mt-2 flex items-center gap-1 text-[11px] text-muted"><Clock3 className="size-3.5" />{intentionLabel}; no equivale a estado en curso.</p>}</section>
}

function ReviewDialog({ content, onClose, onSaved }: { content: ContentRecord; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<ReviewStateInput>({ process: 'alcoholic', decision: '', reason: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<CatalogItem[]>([])
  const currentCategory = content.occupation?.category ?? ''
  // Closing the alcoholic fermentation is when the must becomes wine: offer to reclassify it right here.
  const closingFermentation = form.process === 'alcoholic' && form.decision === 'FINISHED'
  const isMust = currentCategory.toLowerCase() === 'mosto'
  useEffect(() => {
    if (!closingFermentation || categories.length) return
    void catalogApi.getInternalCategories().then((items) => {
      const active = items.filter((item) => item.active)
      setCategories(active)
      // Propose the lot's own category when it is already a wine category.
      const proposal = content.lot?.category && content.lot.category !== currentCategory && content.lot.category.toLowerCase() !== 'mosto'
        ? content.lot.category : ''
      setForm((current) => current.newCategory === undefined ? { ...current, newCategory: proposal } : current)
    }).catch(() => setCategories([]))
  }, [closingFermentation, categories.length, content.lot?.category, currentCategory])
  const handleSubmit = async (event: FormEvent) => { event.preventDefault(); setSaving(true); setError(''); try { await contentApi.reviewState(content.code, { ...form, newCategory: closingFermentation && form.newCategory ? form.newCategory : undefined }); onSaved() } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido guardar.') } finally { setSaving(false) } }
  return <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}><section role="dialog" aria-modal="true" aria-labelledby="review-title" onMouseDown={(event) => event.stopPropagation()} className="h-full w-full max-w-[440px] overflow-y-auto bg-[#fdfbfc] p-5 shadow-xl"><div className="flex justify-between"><h2 id="review-title" className="text-lg font-semibold">Revisar estado</h2><button onClick={onClose} aria-label="Cerrar"><X className="size-4" /></button></div><p className="mt-2 text-xs text-muted">Cada proceso se confirma por separado. La estimación no cambia hasta recibir nuevas evidencias.</p><form onSubmit={handleSubmit} className="mt-5 space-y-4"><label className="block text-xs font-semibold">Proceso<select value={form.process} onChange={(event) => setForm({ ...form, process: event.target.value as ReviewStateInput['process'], decision: '' })} className="mt-1 w-full rounded-xl border border-border bg-white p-2.5"><option value="alcoholic">Fermentación alcohólica</option><option value="malolactic">Maloláctica</option></select></label><div className="rounded-xl bg-plum-soft p-3 text-xs"><p>Estimación: {localize(fermentationLabels, form.process === 'alcoholic' ? content.alcoholic.estimate : content.malolactic.estimate, '—')}</p><p className="mt-1">Confirmación anterior: {localize(fermentationLabels, form.process === 'alcoholic' ? content.alcoholic.confirmation : content.malolactic.confirmation, '—')}</p><p className="mt-1">Evidencias: {content.samples.length} muestra(s) registrada(s)</p></div><label className="block text-xs font-semibold">Decisión<select required value={form.decision} onChange={(event) => setForm({ ...form, decision: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-white p-2.5"><option value="">Selecciona un estado</option>{(form.process === 'alcoholic' ? ['NOT_STARTED', 'ACTIVE', 'SLOW', 'SUSPECTED_STOP', 'FINISHED'] : ['NOT_STARTED', 'ACTIVE', 'SLOW', 'FINISHED', 'NOT_EXPECTED']).map((code) => <option key={code} value={code}>{fermentationLabels[code]}</option>)}</select></label>{closingFermentation && <label className="block text-xs font-semibold">Categoría del producto<select value={form.newCategory ?? ''} onChange={(event) => setForm({ ...form, newCategory: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-white p-2.5"><option value="">Mantener «{currentCategory || 'sin categoría'}»</option>{categories.filter((item) => item.name !== currentCategory).map((item) => <option key={item.id} value={item.code}>{item.name}</option>)}</select><span className={`mt-1 block text-[11px] font-normal ${isMust ? 'text-plum' : 'text-muted'}`}>{isMust ? 'Al terminar la fermentación, el mosto pasa a vino: elige su categoría.' : 'Cámbiala solo si el producto debe reclasificarse.'}</span></label>}<label className="block text-xs font-semibold">Motivo *<textarea required value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-border bg-white p-2.5" /></label>{error && <p role="alert" className="text-xs text-[#8e1f33]">{error}</p>}<button disabled={saving} className="min-h-10 w-full rounded-xl bg-plum text-xs font-semibold text-white disabled:opacity-60">{saving ? 'Guardando…' : 'Confirmar decisión'}</button></form></section></div>
}
