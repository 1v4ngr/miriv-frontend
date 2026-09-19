import { useEffect, useState } from 'react'
import { profileApi, type CenterMember } from '../../../services/profile-api'
import { localDateTimeToIso } from '../../../lib/format'
import type { ConvertInput } from '../services/blend-api'

interface Props { defaultResponsible: string; onConvert: (input: ConvertInput) => Promise<void>; onClose: () => void }

const tomorrowAtNine = () => {
  const date = new Date(Date.now() + 86_400_000)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`
}

/** Asks who runs the blend and when; the server then plans the transfers and creates the task. */
export function ConvertDialog({ defaultResponsible, onConvert, onClose }: Props) {
  const [members, setMembers] = useState<CenterMember[]>([])
  const [responsible, setResponsible] = useState(defaultResponsible)
  const [dueAt, setDueAt] = useState(tomorrowAtNine())
  const [priority, setPriority] = useState('MEDIUM')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { profileApi.listCenterMembers().then(setMembers).catch(() => undefined) }, [])

  const submit = async () => {
    setBusy(true); setError('')
    try { await onConvert({ responsible, dueAt: localDateTimeToIso(dueAt), priority }) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido convertir la simulación.') }
    finally { setBusy(false) }
  }
  const field = 'rounded-xl border border-border bg-white px-2 py-1.5 text-xs font-normal text-copy'
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#2e262a]/30 p-4" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Convertir en tarea" className="w-full max-w-md space-y-3 rounded-2xl bg-white p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <h2 className="text-sm font-semibold">Convertir en tarea</h2>
        <p className="text-xs text-muted">Se crearán los traslados como movimientos <strong>previstos</strong> y una tarea con los pasos. No se mueve vino hasta que ejecutes cada paso.</p>
        <label className="grid gap-1 text-xs font-semibold text-muted">Responsable
          <select value={responsible} onChange={(event) => setResponsible(event.target.value)} className={field}>
            {members.length === 0 && <option value={responsible}>{responsible}</option>}
            {members.map((member) => <option key={member.username} value={member.username}>{member.displayName}</option>)}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-1 text-xs font-semibold text-muted">Fecha prevista<input type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} className={field} /></label>
          <label className="grid gap-1 text-xs font-semibold text-muted">Prioridad
            <select value={priority} onChange={(event) => setPriority(event.target.value)} className={field}><option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option></select>
          </label>
        </div>
        {error && <p role="alert" className="rounded-xl bg-[#f7e0e6] p-2 text-xs text-[#8e1f33]">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2 text-xs font-semibold">Cancelar</button>
          <button type="button" disabled={busy || !responsible || !dueAt} onClick={submit} className="rounded-xl bg-plum px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">{busy ? 'Creando…' : 'Crear tarea'}</button>
        </div>
      </div>
    </div>
  )
}
