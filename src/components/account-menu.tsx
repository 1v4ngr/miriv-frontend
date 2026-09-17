import { useEffect, useState } from 'react'
import { ArrowLeft, LogOut, Pencil, X } from 'lucide-react'
import { clearAccessToken } from '../services/api-client'
import { profileApi, type CenterOption } from '../services/profile-api'
import { PROFILE_UPDATED_EVENT, useCurrentProfile } from '../hooks/use-current-profile'

interface AccountMenuProps {
  open: boolean
  onClose: () => void
  onLogout: () => void
}

const input = 'mt-1.5 h-10 w-full rounded-xl border border-[#e0d2d9] bg-white px-3 text-[13px] font-normal outline-none focus:border-[#b9899c]'

export function AccountMenu({ open, onClose, onLogout }: AccountMenuProps) {
  const profile = useCurrentProfile()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ firstName: '', lastName: '', jobTitle: '', avatarUrl: '', centerCode: '' })
  const [centers, setCenters] = useState<CenterOption[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) setForm({ firstName: profile.firstName, lastName: profile.lastName, jobTitle: profile.jobTitle ?? '', avatarUrl: profile.avatarUrl ?? '', centerCode: profile.centerCode ?? '' })
  }, [profile])

  useEffect(() => {
    if (!open) { setEditing(false); setError('') }
  }, [open])

  useEffect(() => {
    if (editing && centers.length === 0) profileApi.getCenters().then(setCenters).catch(() => undefined)
  }, [editing, centers.length])

  if (!open) return null

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.firstName.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true)
    setError('')
    try {
      await profileApi.updateProfile({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        jobTitle: form.jobTitle.trim() || undefined,
        avatarUrl: form.avatarUrl.trim() || undefined,
        centerCode: form.centerCode || undefined,
      })
      window.dispatchEvent(new Event(PROFILE_UPDATED_EVENT))
      setEditing(false)
    } catch {
      setError('No se ha podido guardar el perfil.')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    clearAccessToken()
    onLogout()
  }

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-[#2e262a]/30" onMouseDown={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby="account-menu-title" onMouseDown={(event) => event.stopPropagation()} className="flex h-full w-full max-w-[410px] flex-col overflow-y-auto border-l border-border bg-[#fdfbfc] p-5 shadow-xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">MIRIV · Mi cuenta</div>
            <h2 id="account-menu-title" className="text-[21px] font-semibold tracking-[-0.02em]">{editing ? 'Editar perfil' : 'Mi cuenta'}</h2>
          </div>
          <button type="button" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border hover:bg-plum-soft" aria-label="Cerrar panel"><X className="size-4" /></button>
        </div>

        {!editing && (
          <div className="mt-4 rounded-2xl border border-border bg-white p-4 text-[12.5px]">
            <div className="flex items-center gap-3">
              {profile?.avatarUrl
                ? <img src={profile.avatarUrl} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                : <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#e8dcea] text-sm font-bold text-plum">{(profile?.firstName?.[0] ?? '—').toUpperCase()}</div>}
              <div className="min-w-0">
                <p className="m-0 font-semibold">{profile?.displayName || 'Cargando…'}</p>
                <p className="mt-1 text-muted">{[profile?.jobTitle, profile?.centerName].filter(Boolean).join(' · ') || '—'}</p>
              </div>
            </div>
            <p className="mt-3 text-muted">{profile?.email}</p>

            <button type="button" onClick={() => setEditing(true)} className="mt-5 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border px-4 font-semibold text-copy hover:bg-plum-soft">
              <Pencil className="size-3.5" aria-hidden="true" />Editar perfil
            </button>
            <button type="button" onClick={handleLogout} className="mt-2 flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-plum px-4 font-semibold text-white hover:bg-plum-dark">
              <LogOut className="size-3.5" aria-hidden="true" />Cerrar sesión
            </button>
          </div>
        )}

        {editing && (
          <form onSubmit={handleSave} className="mt-4 space-y-3 rounded-2xl border border-border bg-white p-4 text-[12.5px]">
            <div className="flex items-center gap-3">
              {form.avatarUrl
                ? <img src={form.avatarUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" onError={(event) => { event.currentTarget.style.visibility = 'hidden' }} />
                : <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[#e8dcea] text-sm font-bold text-plum">{(form.firstName[0] ?? '').toUpperCase()}</div>}
              <label className="block flex-1 text-[12px] font-semibold text-copy">URL de la foto
                <input type="url" placeholder="https://…" value={form.avatarUrl} onChange={(event) => setForm({ ...form, avatarUrl: event.target.value })} className={input} />
              </label>
            </div>
            <label className="block text-[12px] font-semibold text-copy">Nombre *
              <input required value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className={input} />
            </label>
            <label className="block text-[12px] font-semibold text-copy">Apellidos
              <input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className={input} />
            </label>
            <label className="block text-[12px] font-semibold text-copy">Puesto
              <input value={form.jobTitle} onChange={(event) => setForm({ ...form, jobTitle: event.target.value })} className={input} />
            </label>
            <label className="block text-[12px] font-semibold text-copy">Centro
              <select value={form.centerCode} onChange={(event) => setForm({ ...form, centerCode: event.target.value })} className={input}>
                {centers.length === 0 && <option value={form.centerCode}>{profile?.centerName ?? 'Cargando…'}</option>}
                {centers.map((center) => <option key={center.code} value={center.code}>{center.name}</option>)}
              </select>
            </label>
            {error && <p role="alert" className="text-[12px] text-[#8e3b4a]">{error}</p>}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setEditing(false)} className="min-h-10 flex-1 rounded-xl border border-border px-4 font-semibold text-copy hover:bg-plum-soft">Cancelar</button>
              <button type="submit" disabled={saving} className="min-h-10 flex-1 rounded-xl bg-plum px-4 font-semibold text-white hover:bg-plum-dark disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
            </div>
          </form>
        )}

        <button type="button" onClick={onClose} className="mt-auto pt-8 text-left text-[12px] font-semibold text-plum hover:text-plum-dark"><ArrowLeft className="mr-1 inline size-3.5" />Volver al inicio</button>
      </section>
    </div>
  )
}
