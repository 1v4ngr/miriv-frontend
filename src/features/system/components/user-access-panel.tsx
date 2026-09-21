import { useEffect, useState } from 'react'
import { KeyRound, Shield, ShieldOff, UserCheck, UserMinus } from 'lucide-react'
import { adminAccountsApi, type PermissionOption, type RoleOption, type UserAccount } from '../../../services/admin-accounts-api'
import { ACCOUNT_UPDATED_EVENT, useAccount } from '../../../hooks/use-permissions'

const input = 'rounded-xl border border-border bg-white px-3 py-2 text-xs'

/**
 * Roles, individual grants, password and account status for one user (F1C-09 / UI25).
 * The server refuses changes to your own account (unless you are SUPER_ADMIN), changes to a
 * super administrator's account by an ordinary admin, and removing the last active (super)admin;
 * the panel says so up front instead of letting the request fail.
 */
export function UserAccessPanel({ username, onChanged }: { username: string; onChanged?: () => void }) {
  const me = useAccount()
  const [account, setAccount] = useState<UserAccount>()
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [permissions, setPermissions] = useState<PermissionOption[]>([])
  const [draftRole, setDraftRole] = useState('')
  const [draftPermission, setDraftPermission] = useState('')
  const [draftReason, setDraftReason] = useState('')
  const [statusReason, setStatusReason] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    setAccount(undefined); setNotice(''); setError('')
    Promise.all([adminAccountsApi.list(), adminAccountsApi.listRoles(), adminAccountsApi.listPermissions()])
      .then(([list, roleList, permissionList]) => {
        if (!active) return
        setAccount(list.find((item) => item.username.toLowerCase() === username.toLowerCase()))
        setRoles(roleList)
        setPermissions(permissionList)
      })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'No se han podido cargar los permisos.') })
    return () => { active = false }
  }, [username])

  if (error && !account) return <p role="alert" className="mt-5 rounded-xl bg-[#f7e0e6] p-3 text-xs text-[#8e1f33]">{error}</p>
  if (!account) return <p className="mt-5 text-xs text-muted">Cargando roles y permisos…</p>

  const isSelf = me?.username.toLowerCase() === account.username.toLowerCase()
  const iAmSuper = !!me?.roles.some((role) => role.code === 'SUPER_ADMIN')
  const targetIsSuper = account.roles.some((role) => role.code === 'SUPER_ADMIN')
  // What this admin may not touch: their own access (unless super admin) or another super admin's account.
  const locked = (isSelf && !iAmSuper) || (!isSelf && targetIsSuper && !iAmSuper)
  const permissionLabel = (code: string) => permissions.find((item) => item.code === code)?.description ?? code

  const run = async (action: () => Promise<UserAccount | void>, message: string) => {
    setBusy(true); setError(''); setNotice('')
    try {
      const updated = await action()
      if (updated) setAccount(updated)
      setNotice(message)
      onChanged?.()
      // Your own roles or grants changed: refresh the menu and buttons that depend on them.
      if (isSelf) window.dispatchEvent(new Event(ACCOUNT_UPDATED_EVENT))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar el cambio.')
    } finally {
      setBusy(false)
    }
  }

  const assignRole = () => draftRole && run(async () => { const updated = await adminAccountsApi.assignRole(account.id, { roleCode: draftRole }); setDraftRole(''); return updated }, 'Rol asignado.')
  const revokeRole = (assignmentId: string) => run(() => adminAccountsApi.revokeRole(account.id, assignmentId), 'Rol retirado.')
  const grant = () => {
    if (!draftPermission || draftReason.trim().length < 3) { setError('Elige un permiso y escribe el motivo (mínimo 3 caracteres).'); return }
    run(async () => { const updated = await adminAccountsApi.grantPermission(account.id, { permissionCode: draftPermission, reason: draftReason.trim() }); setDraftPermission(''); setDraftReason(''); return updated }, 'Permiso concedido.')
  }
  const revokeGrant = (grantId: string) => run(() => adminAccountsApi.revokePermission(account.id, grantId), 'Concesión retirada.')
  const resetPassword = () => {
    if (newPassword.length < 10) { setError('La contraseña debe tener al menos 10 caracteres.'); return }
    run(async () => { await adminAccountsApi.resetPassword(account.id, newPassword); setNewPassword('') }, 'Contraseña restablecida. Comunícasela a la persona por un canal seguro.')
  }
  
  const changeStatus = (deactivate: boolean) => {
    if (statusReason.trim().length < 3) { setError('Indica el motivo (mínimo 3 caracteres).'); return }
    run(async () => {
      const updated = deactivate ? await adminAccountsApi.deactivate(account.id, statusReason.trim()) : await adminAccountsApi.reactivate(account.id, statusReason.trim())
      setStatusReason('')
      return updated
    }, deactivate ? 'Cuenta desactivada.' : 'Cuenta reactivada.')
  }

  return (
    <div className="mt-6 space-y-5 border-t border-border pt-5">
      {isSelf && !iAmSuper && (
        <p className="rounded-xl bg-[#f5eed0] p-3 text-xs text-[#6b5a10]">
          Es tu propia cuenta: tus roles, concesiones y estado solo los puede cambiar <strong>otro administrador</strong> (evita que alguien se conceda permisos a sí mismo).
        </p>
      )}
      {isSelf && iAmSuper && (
        <p className="rounded-xl bg-[#e8e0f0] p-3 text-xs text-plum">
          Eres superadministrador: tienes todos los permisos y puedes ajustar también tu propia cuenta. Debe quedar siempre al menos un superadministrador activo.
        </p>
      )}
      {!isSelf && targetIsSuper && !iAmSuper && (
        <p className="rounded-xl bg-[#f5eed0] p-3 text-xs text-[#6b5a10]">
          Esta persona es <strong>superadministradora</strong>: solo otro superadministrador puede cambiar su cuenta.
        </p>
      )}
      {error && <p role="alert" className="rounded-xl bg-[#f7e0e6] p-3 text-xs text-[#8e1f33]">{error}</p>}
      {notice && <p role="status" className="rounded-xl bg-[#dceadf] p-3 text-xs text-[#1f5c3a]">{notice}</p>}

      <section>
        <h3 className="text-xs font-semibold">Roles</h3>
        <ul className="mt-2 space-y-1">
          {account.roles.length === 0 && <li className="text-xs text-muted">Sin roles: esta persona no puede hacer nada.</li>}
          {account.roles.map((role) => (
            <li key={role.roleId} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-field px-3 py-2 text-xs">
              <span><strong>{role.name}</strong>{role.zoneName ? ` · solo zona ${role.zoneName}` : ' · todas las zonas'}</span>
              {!locked && <button type="button" disabled={busy} onClick={() => revokeRole(role.roleId)} className="flex items-center gap-1 text-[#8e1f33] hover:underline disabled:opacity-50"><ShieldOff className="size-3.5" />Quitar</button>}
            </li>
          ))}
        </ul>
        {!locked && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select value={draftRole} onChange={(event) => setDraftRole(event.target.value)} className={input}>
              <option value="">Añadir rol…</option>
              {roles.filter((role) => !account.roles.some((current) => current.code === role.code && !current.zoneId)).map((role) => <option key={role.code} value={role.code}>{role.name}</option>)}
            </select>
            <button type="button" disabled={busy || !draftRole} onClick={assignRole} className="flex items-center gap-1 rounded-xl bg-plum px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Shield className="size-3.5" />Asignar rol</button>
          </div>
        )}
      </section>

      <section>
        <h3 className="text-xs font-semibold">Permisos individuales</h3>
        <p className="mt-1 text-[11px] text-muted">Permisos sueltos que no vienen con el rol (por ejemplo, que un enólogo introduzca o valide resultados).</p>
        <ul className="mt-2 space-y-1">
          {account.grants.length === 0 && <li className="text-xs text-muted">Sin permisos individuales.</li>}
          {account.grants.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-field px-3 py-2 text-xs">
              <span><strong>{permissionLabel(item.permissionCode)}</strong>{item.zoneCode ? ` · zona ${item.zoneCode}` : ''} — {item.reason}</span>
              {!locked && <button type="button" disabled={busy} onClick={() => revokeGrant(item.id)} className="flex items-center gap-1 text-[#8e1f33] hover:underline disabled:opacity-50"><ShieldOff className="size-3.5" />Quitar</button>}
            </li>
          ))}
        </ul>
        {!locked && (
          <div className="mt-2 grid gap-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]">
            <select value={draftPermission} onChange={(event) => setDraftPermission(event.target.value)} className={input}>
              <option value="">Permiso…</option>
              {permissions.filter((item) => item.grantable || iAmSuper).map((item) => <option key={item.code} value={item.code}>{item.description}</option>)}
            </select>
            <input value={draftReason} onChange={(event) => setDraftReason(event.target.value)} placeholder="Motivo (obligatorio)" className={input} />
            <button type="button" disabled={busy} onClick={grant} className="flex items-center justify-center gap-1 rounded-xl bg-plum px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Shield className="size-3.5" />Conceder</button>
          </div>
        )}
      </section>

      {!locked && <section>
        <h3 className="text-xs font-semibold">Contraseña</h3>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Nueva contraseña (mín. 10)" autoComplete="new-password" className={`${input} min-w-[240px]`} />
          <button type="button" disabled={busy || !newPassword} onClick={resetPassword} className="flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50"><KeyRound className="size-3.5" />Restablecer</button>
        </div>
      </section>}

      {!isSelf && !locked && (
        <section>
          <h3 className="text-xs font-semibold">Estado de la cuenta · {account.active ? 'Activa' : 'Desactivada'}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Motivo del cambio" className={`${input} min-w-[240px]`} />
            {account.active
              ? <button type="button" disabled={busy} onClick={() => changeStatus(true)} className="flex items-center gap-1 rounded-xl border border-[#f0d9de] bg-white px-3 py-2 text-xs font-semibold text-[#8e1f33] disabled:opacity-50"><UserMinus className="size-3.5" />Desactivar</button>
              : <button type="button" disabled={busy} onClick={() => changeStatus(false)} className="flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-[#1f5c3a] disabled:opacity-50"><UserCheck className="size-3.5" />Reactivar</button>}
          </div>
        </section>
      )}
    </div>
  )
}
