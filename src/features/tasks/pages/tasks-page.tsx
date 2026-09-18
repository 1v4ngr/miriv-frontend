import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ArrowRight, Plus, Search } from 'lucide-react'
import { tasksApi, type CreateTaskInput } from '../services/tasks-api'
import { profileApi, type CenterMember } from '../../../services/profile-api'
import { cellarApi } from '../../cellar/services/cellar-api'
import { useCurrentProfile } from '../../../hooks/use-current-profile'
import { activeOccupation } from '../../cellar/utils'
import { nowTimeInCenter, todayInCenter } from '../../../lib/format'
import type { Deposit } from '../../cellar/types'
import type { Task, TaskGroup, TaskPriority } from '../types'

interface Props { onOpen: (id: string) => void }
const groups: { id: TaskGroup; label: string; tone: string }[] = [
  { id: 'overdue', label: 'Vencidas', tone: 'text-[#8e1f33]' },
  { id: 'today', label: 'Hoy', tone: 'text-plum' },
  { id: 'upcoming', label: 'Próximas', tone: 'text-copy' },
  { id: 'unscheduled', label: 'Sin fecha', tone: 'text-copy' },
  { id: 'closed', label: 'Cerradas', tone: 'text-muted' },
]
const priority: Record<TaskPriority, string> = { Alta: 'bg-[#fae3d3] text-[#8a4715]', Media: 'bg-[#f5eed0] text-[#6b5a10]', Baja: 'bg-[#e9e4ee] text-copy', 'Sin prioridad': 'bg-[#e9e4ee] text-copy' }

export function TasksPage({ onOpen }: Props) {
  const [tasks, setTasks] = useState<Task[]>([]); const [scope, setScope] = useState<'mine' | 'team' | 'unassigned'>('mine'); const [search, setSearch] = useState(''); const [creating, setCreating] = useState(false); const [showClosed, setShowClosed] = useState(false)
  const profile = useCurrentProfile()
  const load = () => tasksApi.getAll().then(setTasks)
  useEffect(() => { load() }, [])
  const openTasks = useMemo(() => tasks.filter((task) => task.group !== 'closed'), [tasks])
  const visible = useMemo(() => tasks.filter((task) => (showClosed || task.group !== 'closed') && (scope === 'mine' ? task.responsibleUsername === profile?.username || task.responsible === profile?.displayName : scope === 'unassigned' ? !task.responsible : true) && `${task.title} ${task.depositCode ?? ''} ${task.contentCode ?? ''} ${task.lotCode ?? ''} ${task.detail}`.toLocaleLowerCase('es').includes(search.trim().toLocaleLowerCase('es'))), [showClosed, search, tasks, profile, scope])

  return <div className="mx-auto max-w-6xl space-y-4 pb-6"><header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[11px] text-muted">Tareas · {profile?.centerName ?? 'Centro'}</p><h1 className="mt-1 text-[23px] font-semibold">Tareas</h1><p className="mt-1 text-xs text-muted">{openTasks.length} pendientes · agenda agrupada por vencimiento.</p></div><button onClick={() => setCreating(true)} className="min-h-10 rounded-xl bg-plum px-4 text-xs font-semibold text-white"><Plus className="mr-1 inline size-4" />Crear tarea</button></header><div className="flex flex-wrap items-center gap-2"><div className="flex rounded-xl border border-border bg-white p-1">{([{ id: 'mine', label: 'Mis tareas' }, { id: 'team', label: 'Equipo' }, { id: 'unassigned', label: 'Sin asignar' }] as const).map((item) => <button key={item.id} onClick={() => setScope(item.id)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${scope === item.id ? 'bg-plum-soft text-plum' : 'text-copy'}`}>{item.label}</button>)}</div><label className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-border bg-white px-3 text-xs text-muted sm:max-w-sm"><Search className="size-4" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent outline-none" placeholder="Filtrar por zona o tipo" /></label><label className="flex h-10 items-center gap-2 rounded-xl border border-border bg-white px-3 text-xs text-copy"><input type="checkbox" checked={showClosed} onChange={(event) => setShowClosed(event.target.checked)} />Mostrar cerradas</label></div><div className="space-y-5">{groups.filter((group) => showClosed || group.id !== 'closed').map((group) => { const items = visible.filter((task) => task.group === group.id); if (!items.length) return null; return <section key={group.id}><h2 className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] ${group.tone}`}>{group.label} <span className="font-mono">{items.length}</span></h2><div className="space-y-2">{items.map((task) => <TaskRow key={task.id} task={task} onOpen={onOpen} />)}</div></section> })}{!visible.length && <p className="rounded-2xl border border-border bg-white p-8 text-center text-xs text-muted">No hay tareas que coincidan con este filtro.</p>}</div>{creating && <CreateTask defaultResponsible={profile?.username ?? ''} onClose={() => setCreating(false)} onSaved={async (input) => { const task = await tasksApi.create(input); setCreating(false); load(); onOpen(task.id) }} />}</div>
}
function TaskRow({ task, onOpen }: { task: Task; onOpen: (id: string) => void }) { return <button onClick={() => onOpen(task.id)} className={`grid w-full gap-2 rounded-2xl border bg-white p-4 text-left hover:bg-plum-soft sm:grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] sm:items-center sm:gap-4 ${task.group === 'overdue' ? 'border-[#f0d9de]' : 'border-border'}`}><span className={`w-fit rounded-full px-2 py-1 text-[10px] font-semibold ${priority[task.priority]}`}>{task.priority}</span><span className="min-w-0"><span className="block text-xs font-semibold">{task.title}{task.partial && <span className="ml-2 rounded-full bg-[#dceadf] px-1.5 py-0.5 text-[9px] text-[#1f5c3a]">Parcialmente realizada</span>}</span><span className="mt-1 block text-[11px] text-muted">{[task.depositCode, task.contentCode, task.lotCode, task.detail].filter(Boolean).join(' · ')}</span></span><span className={`font-mono text-xs ${task.group === 'overdue' ? 'text-[#8e1f33]' : 'text-copy'}`}>{task.dueLabel}</span><span className="text-xs text-copy">{task.responsible || 'Sin asignar'}</span><ArrowRight className="size-4 text-plum" /></button> }

function CreateTask({ defaultResponsible, onClose, onSaved }: { defaultResponsible: string; onClose: () => void; onSaved: (input: CreateTaskInput) => Promise<void> }) {
  const [form, setForm] = useState({ title: '', priority: 'Media' as TaskPriority, dueAt: `${todayInCenter()}T17:00`, depositCode: '', contentCode: '', detail: '', requiresValidatedAnalysis: false })
  const [centerMembers, setCenterMembers] = useState<CenterMember[]>([])
  const [responsible, setResponsible] = useState(defaultResponsible)
  const [deposits, setDeposits] = useState<Deposit[]>([])
  const [saving, setSaving] = useState(false); const [error, setError] = useState('')
  useEffect(() => { profileApi.listCenterMembers().then(setCenterMembers).catch(() => undefined) }, [])
  useEffect(() => { cellarApi.getDeposits().then(setDeposits).catch(() => undefined) }, [])
  const selectedDeposit = deposits.find((deposit) => deposit.code === form.depositCode)
  const occupation = selectedDeposit ? activeOccupation(selectedDeposit) : undefined
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!form.title.trim() || !responsible.trim()) return
    setSaving(true); setError('')
    try { await onSaved({ title: form.title, priority: form.priority, dueAt: form.dueAt, depositCode: form.depositCode, contentCode: occupation?.contentCode, responsible, description: form.detail || undefined, requiresValidatedAnalysis: form.requiresValidatedAnalysis }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido crear la tarea.') }
    finally { setSaving(false) }
  }
  return <div className="fixed inset-0 z-30 flex items-end justify-center bg-[#2e262a]/30 p-4 sm:items-center" onMouseDown={onClose}><form onSubmit={submit} onMouseDown={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-[#fdfbfc] p-5 shadow-xl"><h2 className="text-lg font-semibold">Crear tarea</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Título" value={form.title} onChange={(title) => setForm({ ...form, title })} /><label className="text-xs font-semibold">Prioridad<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })} className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm font-normal"><option>Alta</option><option>Media</option><option>Baja</option><option>Sin prioridad</option></select></label><label className="text-xs font-semibold">Vencimiento *<input required type="datetime-local" value={form.dueAt} onChange={(event) => setForm({ ...form, dueAt: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm font-normal" /></label><label className="text-xs font-semibold">Depósito *<select required value={form.depositCode} onChange={(event) => setForm({ ...form, depositCode: event.target.value })} className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm font-normal"><option value="">Selecciona un depósito</option>{deposits.map((deposit) => <option key={deposit.code} value={deposit.code}>{deposit.code}{activeOccupation(deposit) ? ` · ${activeOccupation(deposit)!.contentCode}` : ''}</option>)}</select></label><div className="text-xs font-semibold text-copy">Contenido<p className="mt-1 rounded-xl border border-border bg-field p-3 text-sm font-normal">{occupation?.contentCode ?? 'Sin contenido activo'}</p></div><label className="text-xs font-semibold">Responsable *<select required value={responsible} onChange={(event) => setResponsible(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm font-normal"><option value="">Selecciona un responsable</option>{centerMembers.map((member) => <option key={member.username} value={member.username}>{member.displayName || member.username}</option>)}</select></label></div>
    <label className="mt-3 block text-xs font-semibold">Detalle<textarea value={form.detail} onChange={(event) => setForm({ ...form, detail: event.target.value })} className="mt-1 min-h-20 w-full rounded-xl border border-border bg-white p-3 text-sm font-normal" /></label>
    <label className="mt-3 flex items-start gap-2 text-[12px] text-copy"><input type="checkbox" checked={form.requiresValidatedAnalysis} onChange={(event) => setForm({ ...form, requiresValidatedAnalysis: event.target.checked })} />Exige análisis validado para completarse</label>
    {error && <p role="alert" className="mt-3 text-xs text-[#8e1f33]">{error}</p>}
    <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-3 text-xs font-semibold">Cancelar</button><button disabled={saving || !form.title.trim() || !responsible.trim() || !form.depositCode} className="rounded-xl bg-plum px-4 py-3 text-xs font-semibold text-white disabled:opacity-60">{saving ? 'Creando…' : 'Crear y abrir'}</button></div>
  </form></div>
}
function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-xs font-semibold">{label}<input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-white p-3 text-sm font-normal" /></label> }