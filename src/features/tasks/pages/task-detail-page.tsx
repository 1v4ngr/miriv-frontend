import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { tasksApi, type CompleteTaskInput } from '../services/tasks-api'
import { laboratoryApi } from '../../laboratory/services/laboratory-api'
import { nowTimeInCenter, todayInCenter } from '../../../lib/format'
import type { Sample } from '../../laboratory/types'
import type { Task } from '../types'

import { TaskBlendSteps } from '../../blend/components/task-blend-steps'

interface Props { id: string; onBack: () => void; onOpenContent: (code: string) => void; onOpenLaboratory: (code?: string) => void; onNavigate?: (path: string) => void }

interface ExecutionDraft {
  executedAt: string
  result: string
  samplePoint: string
  sampleCode: string
  observations: string
}

const emptyDraft = (): ExecutionDraft => ({ executedAt: `${todayInCenter()}T${nowTimeInCenter()}`, result: 'Realizada', samplePoint: '', sampleCode: '', observations: '' })
const RESULTS = ['Realizada', 'Realizada con incidencias', 'No realizada'] as const

export function TaskDetailPage({ id, onBack, onOpenContent, onOpenLaboratory, onNavigate }: Props) {
  const [task, setTask] = useState<Task>()
  const [draft, setDraft] = useState<ExecutionDraft>(emptyDraft)
  const [samples, setSamples] = useState<Sample[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [starting, setStarting] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancel, setShowCancel] = useState(false)

  const load = () => { void tasksApi.getById(id).then(setTask) }
  useEffect(load, [id])
  useEffect(() => { laboratoryApi.getSamples().then(setSamples).catch(() => undefined) }, [])

  if (!task) return <p className="p-6 text-center text-xs text-muted">Cargando tarea…</p>

  const requiresAnalysis = task.completionCriterion === 'ANALYSIS_REQUIRED'
  const linkedSamples = samples.filter((sample) => sample.contentCode === task.contentCode)
  const validatedSamples = linkedSamples.filter((sample) => sample.status === 'Validado')

  const reloadAfter = async () => {
    const updated = await tasksApi.getById(id)
    if (updated) setTask(updated)
    return updated
  }

  const handleStart = async () => {
    setStarting(true); setError(''); setNotice('')
    try { await tasksApi.start(id); await reloadAfter(); setNotice('Tarea iniciada.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido iniciar la tarea.') }
    finally { setStarting(false) }
  }

  const handleComplete = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setError(''); setNotice('')
    try {
      const payload: CompleteTaskInput = { executedAt: draft.executedAt, result: draft.result, samplePoint: draft.samplePoint || undefined, sampleCode: draft.sampleCode || undefined, observations: draft.observations || undefined }
      await tasksApi.execute(id, payload)
      await reloadAfter()
      setDraft(emptyDraft())
      setNotice('Tarea completada.')
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido registrar la ejecución.') }
    finally { setSaving(false) }
  }

  const handleCancel = async () => {
    if (!cancelReason.trim()) { setError('Indica el motivo de cancelación.'); return }
    setSaving(true); setError('')
    try { await tasksApi.cancel(id, cancelReason.trim()); await reloadAfter(); setShowCancel(false); setCancelReason(''); setNotice('Tarea cancelada.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido cancelar la tarea.') }
    finally { setSaving(false) }
  }

  const isClosed = task.status === 'DONE' || task.status === 'CANCELLED'

  return <div className="mx-auto max-w-6xl space-y-4 pb-6"><button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-plum"><ArrowLeft className="size-4" />Volver a tareas</button><header className="rounded-2xl border border-border bg-white p-4 sm:p-5"><div className="flex flex-wrap justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-[22px] font-semibold">{task.title}</h1><span className="rounded-full bg-[#fae3d3] px-2.5 py-1 text-[10px] font-semibold text-[#8a4715]">{task.priority}</span><span className="rounded-full bg-[#e3e3ef] px-2.5 py-1 text-[10px] font-semibold text-[#43435c]">{task.status}</span></div><p className="mt-2 text-xs text-copy">{[task.depositCode, task.contentCode, task.dueLabel, `responsable ${task.responsible}`].filter(Boolean).join(' · ')}</p>{task.description && <p className="mt-1 text-[11px] text-muted">{task.description}</p>}</div>{!isClosed && <div className="flex gap-2"><button onClick={() => setShowCancel(true)} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold">Cancelar</button></div>}</div></header>{onNavigate && <TaskBlendSteps description={task.description} onNavigate={onNavigate} />}
    <p className="text-[12px] text-muted">Al registrar la ejecución, el servidor comprueba que el contenido sigue en {task.depositCode ?? 'su depósito'}. Si se ha movido, la tarea no se podrá completar.</p>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(270px,1fr)]">
      <div className="space-y-4">
        {task.status === 'PENDING' && <button type="button" onClick={handleStart} disabled={starting} className="w-full rounded-xl bg-plum px-4 py-3 text-xs font-semibold text-white disabled:opacity-60">{starting ? 'Iniciando…' : 'Iniciar tarea'}</button>}
        {(task.status === 'PENDING' || task.status === 'IN_PROGRESS') && <form onSubmit={handleComplete} className="rounded-2xl border border-border bg-[#fdfbfc] p-4"><h2 className="text-sm font-semibold">Registrar ejecución</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">Fecha y hora real *<input required type="datetime-local" value={draft.executedAt} onChange={(event) => setDraft({ ...draft, executedAt: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm font-normal" /></label>
            <label className="text-xs font-semibold">Resultado *<select required value={draft.result} onChange={(event) => setDraft({ ...draft, result: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm font-normal">{RESULTS.map((value) => <option key={value}>{value}</option>)}</select></label>
            <label className="text-xs font-semibold">Punto de muestreo<input value={draft.samplePoint} onChange={(event) => setDraft({ ...draft, samplePoint: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm font-normal" /></label>
            <label className="text-xs font-semibold">Muestra vinculada{requiresAnalysis ? ' *' : ''}<select required={requiresAnalysis} value={draft.sampleCode} onChange={(event) => setDraft({ ...draft, sampleCode: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm font-normal"><option value="">{requiresAnalysis ? 'Selecciona una muestra validada' : 'Sin muestra'}</option>{(requiresAnalysis ? validatedSamples : linkedSamples).map((sample) => <option key={sample.code} value={sample.code}>{sample.code}{requiresAnalysis ? ' · Validado' : ''}</option>)}</select></label>
          </div>
          <label className="mt-3 block text-xs font-semibold">Observaciones<textarea value={draft.observations} onChange={(event) => setDraft({ ...draft, observations: event.target.value })} className="mt-1 min-h-24 w-full rounded-xl border border-border bg-white p-3 text-sm font-normal" /></label>
          {requiresAnalysis && linkedSamples.length === 0 && <p className="mt-3 rounded-xl bg-[#f5eed0] p-3 text-xs text-[#6b5a10]">Esta tarea exige una muestra validada en laboratorio; todavía no hay ninguna para este contenido.</p>}
          <button disabled={saving || (requiresAnalysis && !draft.sampleCode)} className="mt-4 w-full rounded-xl bg-plum py-3 text-xs font-semibold text-white disabled:opacity-60">{saving ? 'Guardando…' : 'Registrar ejecución'}</button>
        </form>}
        {task.status === 'DONE' && task.execution && <section className="rounded-2xl border border-border bg-white p-4"><h2 className="text-sm font-semibold">Ejecución registrada</h2><dl className="mt-3 grid gap-3 sm:grid-cols-2"><Item label="Fecha y hora" value={new Date(task.execution.executedAt).toLocaleString('es')} /><Item label="Resultado" value={task.execution.result} /><Item label="Punto de muestreo" value={task.execution.samplePoint ?? 'No indicado'} /><Item label="Muestra" value={task.execution.sampleCode ?? 'No vinculada'} /></dl>{task.execution.notes && <p className="mt-3 text-xs text-copy">{task.execution.notes}</p>}{task.execution.sampleCode && <button onClick={() => onOpenLaboratory(task.execution!.sampleCode)} className="mt-3 inline-flex items-center gap-1 text-plum underline">Abrir muestra {task.execution.sampleCode} <ExternalLink className="size-3.5" /></button>}</section>}
        {task.status === 'CANCELLED' && <p className="rounded-xl bg-[#efeff5] p-3 text-xs text-muted">Esta tarea está cancelada y no admite nuevas ejecuciones.</p>}
        {error && <p role="alert" className="text-xs text-[#8e1f33]">{error}</p>}
        {notice && <p role="status" className="rounded-xl bg-[#dceadf] p-3 text-xs text-[#1f5c3a]">{notice}</p>}
      </div>
      <aside className="space-y-4">
        <section className="rounded-2xl border border-border bg-[#fdfbfc] p-4"><h2 className="text-sm font-semibold">Criterio de finalización</h2><p className="mt-2 text-xs text-copy">{task.completionCriterion ?? 'Registrar la ejecución conforme al procedimiento.'}</p></section>
        <section className="rounded-2xl border border-border bg-[#fdfbfc] p-4"><h2 className="text-sm font-semibold">Autor e historial</h2><ol className="mt-3 space-y-3">{task.history.map((entry, index) => <li key={index} className="flex gap-3 text-xs"><time className="w-14 shrink-0 font-mono text-[10px] text-muted">{entry.date}</time><span>{entry.note}</span></li>)}</ol></section>
        {task.contentCode && <button onClick={() => onOpenContent(task.contentCode!)} className="w-full rounded-xl border border-border bg-white p-3 text-left text-xs font-semibold text-plum">Abrir contenido <ExternalLink className="float-right size-4" /></button>}
      </aside>
    </div>
    {showCancel && <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#2e262a]/30 p-4 sm:items-center" onMouseDown={() => setShowCancel(false)}><div role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-md rounded-2xl bg-[#fdfbfc] p-5 shadow-xl"><h2 className="text-lg font-semibold">Cancelar tarea</h2><p className="mt-2 text-xs text-muted">Indica el motivo. La tarea quedará en estado cancelada y no admitirá nuevas ejecuciones.</p><textarea required value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} rows={3} className="mt-3 w-full rounded-xl border border-border bg-white p-3 text-sm" /><div className="mt-3 flex justify-end gap-2"><button type="button" onClick={() => setShowCancel(false)} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold">Volver</button><button type="button" onClick={handleCancel} disabled={saving} className="rounded-xl bg-plum px-3 py-2 text-xs font-semibold text-white disabled:opacity-60">{saving ? 'Cancelando…' : 'Cancelar tarea'}</button></div></div></div>}
  </div>
}
function Item({ label, value }: { label: string; value: string }) { return <div><dt className="text-[11px] text-muted">{label}</dt><dd className="mt-1 font-mono text-xs font-semibold">{value}</dd></div> }