import { useCallback, useEffect, useState } from 'react'
import { Shield, ShieldOff, UserCheck, UserMinus } from 'lucide-react'
import { Can } from '../../../components/can'
import { adminAccountsApi, type UserAccount, type PermissionOption, type RoleOption } from '../../../services/admin-accounts-api'

interface AdminUsersPageProps {
  onNotify: (message: string) => void
}

export function AdminUsersManagementPage({ onNotify }: AdminUsersPageProps) {
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [permissions, setPermissions] = useState<PermissionOption[]>([])
  const [selected, setSelected] = useState<string | undefined>()
  const [draftRole, setDraftRole] = useState('')
  const [draftPermission, setDraftPermission] = useState('')
  const [draftReason, setDraftReason] = useState('')
  const [statusReason, setStatusReason] = useState('')
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [list, rolesData, permsData] = await Promise.all([
        adminAccountsApi.list(),
        adminAccountsApi.listRoles(),
        adminAccountsApi.listPermissions(),
      ])
      setAccounts(list)
      setRoles(rolesData)
      setPermissions(permsData)
      if (!selected && list.length) setSelected(list[0].id)
    } finally {
      setLoading(false)
    }
  }, [selected])

  useEffect(() => { reload() }, [])

  const detail = accounts.find((account) => account.id === selected)

  async function assignRole() {
    if (!detail || !draftRole) return
    try {
      const updated = await adminAccountsApi.assignRole(detail.id, { roleCode: draftRole })
      onNotify('Rol asignado.')
      setAccounts((current) => current.map((item) => item.id === detail.id ? updated : item))
      setDraftRole('')
    } catch (error) { onNotify((error as Error).message) }
  }

  async function revokeRole(roleAssignmentId: string) {
    if (!detail) return
    const updated = await adminAccountsApi.revokeRole(detail.id, roleAssignmentId)
    onNotify('Rol revocado.')
    setAccounts((current) => current.map((item) => item.id === detail.id ? updated : item))
  }

  async function grantPermission() {
    if (!detail || !draftPermission || draftReason.length < 3) {
      onNotify('Indica permiso y motivo (mínimo 3 caracteres).')
      return
    }
    try {
      const updated = await adminAccountsApi.grantPermission(detail.id, {
        permissionCode: draftPermission, reason: draftReason,
      })
      onNotify('Permiso concedido.')
      setAccounts((current) => current.map((item) => item.id === detail.id ? updated : item))
      setDraftPermission(''); setDraftReason('')
    } catch (error) { onNotify((error as Error).message) }
  }

  async function revokePermission(grantId: string) {
    if (!detail) return
    const updated = await adminAccountsApi.revokePermission(detail.id, grantId)
    onNotify('Concesión revocada.')
    setAccounts((current) => current.map((item) => item.id === detail.id ? updated : item))
  }

  async function toggleStatus(action: 'deactivate' | 'reactivate') {
    if (!detail || statusReason.length < 3) { onNotify('Indica el motivo (mínimo 3 caracteres).'); return }
    const updated = action === 'deactivate'
      ? await adminAccountsApi.deactivate(detail.id, statusReason)
      : await adminAccountsApi.reactivate(detail.id, statusReason)
    onNotify(action === 'deactivate' ? 'Cuenta desactivada.' : 'Cuenta reactivada.')
    setAccounts((current) => current.map((item) => item.id === detail.id ? updated : item))
    setStatusReason('')
  }

  if (loading) return <p className="p-6 text-center text-sm text-muted">Cargando cuentas…</p>

  return (
    <div className="space-y-4 p-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold">Administración de cuentas</h1>
          <p className="text-xs text-muted">{accounts.length} cuentas activas — gestiona roles, concesiones individuales y desactivaciones.</p>
        </div>
        <Can permission="USER_MANAGE">
          <p className="rounded-xl bg-plum-soft px-3 py-2 text-xs text-plum">Tienes permisos para modificar asignaciones.</p>
        </Can>
      </header>

      <div className="grid gap-4 md:grid-cols-[260px_1fr]">
        <aside className="rounded-2xl border border-border bg-white p-3">
          <h2 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted">Cuentas</h2>
          <ul className="space-y-1">
            {accounts.map((account) => (
              <li key={account.id}>
                <button type="button" onClick={() => setSelected(account.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition-colors ${account.id === selected ? 'bg-plum-soft font-semibold text-plum' : 'hover:bg-[#faf4f7]'}`}>
                  <span className="block">{account.displayName}</span>
                  <span className="block text-[11px] text-muted">@{account.username}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {detail && (
          <section className="space-y-4 rounded-2xl border border-border bg-white p-4">
            <header>
              <h2 className="text-lg font-semibold">{detail.displayName}</h2>
              <p className="text-xs text-muted">@{detail.username} · {detail.email}</p>
              <p className="text-xs text-muted">Estado: {detail.active ? 'Activa' : 'Desactivada'} · Alta {new Date(detail.createdAt).toLocaleDateString('es-ES')}</p>
            </header>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Roles</h3>
              <ul className="space-y-1">
                {detail.roles.length === 0 && <li className="text-xs text-muted">Sin roles asignados.</li>}
                {detail.roles.map((role) => (
                  <li key={role.roleId} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-field px-3 py-2 text-xs">
                    <span><strong>{role.name}</strong> · {role.code}{role.zoneName ? ` · zona ${role.zoneName}` : ' · todas las zonas'}</span>
                    <Can permission="USER_MANAGE">
                      <button type="button" onClick={() => revokeRole(role.roleId)} className="flex items-center gap-1 text-[#8e1f33] hover:underline">
                        <ShieldOff className="size-3.5" />Revocar
                      </button>
                    </Can>
                  </li>
                ))}
              </ul>
              <Can permission="USER_MANAGE">
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select value={draftRole} onChange={(event) => setDraftRole(event.target.value)} className="rounded-xl border border-border bg-white px-3 py-2 text-xs">
                    <option value="">Asignar rol…</option>
                    {roles.map((role) => <option key={role.code} value={role.code}>{role.name}</option>)}
                  </select>
                  <button type="button" onClick={assignRole} className="flex items-center gap-1 rounded-xl bg-plum px-3 py-2 text-xs font-semibold text-white">
                    <Shield className="size-3.5" />Conceder rol
                  </button>
                </div>
              </Can>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Concesiones individuales</h3>
              <ul className="space-y-1">
                {detail.grants.length === 0 && <li className="text-xs text-muted">Sin concesiones individuales.</li>}
                {detail.grants.map((grant) => (
                  <li key={grant.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-field px-3 py-2 text-xs">
                    <span><strong>{grant.permissionCode}</strong>{grant.zoneCode ? ` · zona ${grant.zoneCode}` : ''} — {grant.reason}</span>
                    <Can permission="USER_MANAGE">
                      <button type="button" onClick={() => revokePermission(grant.id)} className="flex items-center gap-1 text-[#8e1f33] hover:underline">
                        <ShieldOff className="size-3.5" />Revocar
                      </button>
                    </Can>
                  </li>
                ))}
              </ul>
              <Can permission="USER_MANAGE">
                <div className="mt-2 grid gap-2 md:grid-cols-[200px_1fr_120px]">
                  <select value={draftPermission} onChange={(event) => setDraftPermission(event.target.value)} className="rounded-xl border border-border bg-white px-3 py-2 text-xs">
                    <option value="">Permiso concedible…</option>
                    {permissions.filter((permission) => permission.grantable).map((permission) => (
                      <option key={permission.code} value={permission.code}>{permission.code}</option>
                    ))}
                  </select>
                  <input value={draftReason} onChange={(event) => setDraftReason(event.target.value)} placeholder="Motivo (obligatorio)" className="rounded-xl border border-border bg-white px-3 py-2 text-xs" />
                  <button type="button" onClick={grantPermission} className="flex items-center justify-center gap-1 rounded-xl bg-plum px-3 py-2 text-xs font-semibold text-white">
                    <Shield className="size-3.5" />Conceder
                  </button>
                </div>
              </Can>
            </div>

            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Estado de la cuenta</h3>
              <Can permission="USER_MANAGE">
                <div className="flex flex-wrap items-center gap-2">
                  <input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Motivo del cambio" className="min-w-[260px] rounded-xl border border-border bg-white px-3 py-2 text-xs" />
                  {detail.active ? (
                    <button type="button" onClick={() => toggleStatus('deactivate')} className="flex items-center gap-1 rounded-xl border border-[#f0d9de] bg-white px-3 py-2 text-xs font-semibold text-[#8e1f33]">
                      <UserMinus className="size-3.5" />Desactivar
                    </button>
                  ) : (
                    <button type="button" onClick={() => toggleStatus('reactivate')} className="flex items-center gap-1 rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-[#1f5c3a]">
                      <UserCheck className="size-3.5" />Reactivar
                    </button>
                  )}
                </div>
              </Can>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}