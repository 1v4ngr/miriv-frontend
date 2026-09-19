import { useEffect, useState } from 'react'
import { adminCentersApi, type AdminCenter, type CenterImpact } from '../services/admin-centers-api'
import { catalogApi, catalogResources, type CatalogItem, type CatalogResource } from '../../../services/catalog-api'
import { adminUsersApi, type AdminUser, type CreateAdminUserInput } from '../services/admin-users-api'
import { adminZonesApi, type AdminZone, type AdminZoneInput } from '../services/admin-zones-api'
import { adminAccountsApi, type RoleOption } from '../../../services/admin-accounts-api'
import { UserAccessPanel } from '../components/user-access-panel'

const card = 'rounded-2xl border border-border bg-white p-4'

type Tab = 'centers' | 'catalogs' | 'users'

export function AdministrationManagementPage() {
  const [tab, setTab] = useState<Tab>('centers')

  return (
    <div className="mx-auto max-w-5xl">
      <header className={card}>
        <h1 className="text-lg font-semibold">Administración</h1>
        <p className="mt-1 text-xs text-muted">Configuración general de la bodega y gestión de cuentas.</p>
        <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1">
          <TabButton active={tab === 'centers'} onClick={() => setTab('centers')}>Centros</TabButton>
          <TabButton active={tab === 'catalogs'} onClick={() => setTab('catalogs')}>Catálogos</TabButton>
          <TabButton active={tab === 'users'} onClick={() => setTab('users')}>Usuarios</TabButton>
        </div>
      </header>
      {tab === 'centers' && <CentersTab />}
      {tab === 'catalogs' && <CatalogsTab />}
      {tab === 'users' && <UsersTab />}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`h-9 shrink-0 whitespace-nowrap rounded-xl px-3 text-[12px] font-semibold ${
        active ? 'bg-plum-soft text-plum' : 'border border-border'
      }`}
    >
      {children}
    </button>
  )
}

function CentersTab() {
  const [centers, setCenters] = useState<AdminCenter[]>([])
  const [form, setForm] = useState<AdminCenter>({ code: '', name: '' })
  const [deleting, setDeleting] = useState<AdminCenter>()
  const load = () => adminCentersApi.list().then(setCenters)
  useEffect(() => { load() }, [])
  const save = async () => {
    if (!form.code || !form.name) return
    await (centers.some((c) => c.code === form.code)
      ? adminCentersApi.update(form.code, form)
      : adminCentersApi.create(form))
    setForm({ code: '', name: '' })
    load()
  }
  return (
    <>
      <section className={`mt-4 ${card}`}>
        <h2 className="text-sm font-semibold">Centros</h2>
        <div className="mt-4 flex gap-2">
        <input
          placeholder="Código"
          value={form.code}
          onChange={(event) => setForm({ ...form, code: event.target.value })}
          className="rounded-xl border border-border p-2 text-xs"
        />
        <input
          placeholder="Nombre"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          className="flex-1 rounded-xl border border-border p-2 text-xs"
        />
        <button onClick={save} className="rounded-xl bg-plum px-3 text-xs font-semibold text-white">
          {form.code && centers.some((c) => c.code === form.code) ? 'Modificar' : 'Añadir'}
        </button>
      </div>
      <div className="mt-4 space-y-2">
        {centers.map((center) => (
          <div key={center.code} className="flex items-center justify-between rounded-xl border border-border p-3 text-xs">
            <span>
              <b>{center.name}</b>
              <span className="ml-2 font-mono text-muted">{center.code}</span>
            </span>
            <span className="flex gap-2">
              <button onClick={() => setForm(center)} className="text-plum">Modificar</button>
              <button onClick={() => setDeleting(center)} className="text-[#8e1f33]">Eliminar</button>
            </span>
          </div>
        ))}
      </div>
      {deleting && <DeleteCenterPanel key={deleting.code} center={deleting} onClose={() => setDeleting(undefined)} onDeleted={() => { setDeleting(undefined); load() }} />}
      </section>
      <ZonesPanel centers={centers} />
    </>
  )
}

/** Shows what goes with the center; a super admin can delete it all after typing its code. */
function DeleteCenterPanel({ center, onClose, onDeleted }: { center: AdminCenter; onClose: () => void; onDeleted: () => void }) {
  const [impact, setImpact] = useState<CenterImpact>()
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    adminCentersApi.impact(center.code).then(setImpact)
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'No se ha podido calcular qué se eliminaría.'))
  }, [center.code])

  const nonEmpty = impact ? Object.entries(impact.counts).filter(([, count]) => count > 0) : []
  const empty = !!impact && nonEmpty.length === 0 && impact.usersDeleted.length === 0
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setError('')
    try { await action(); onDeleted() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'No se ha podido eliminar el centro.') }
    finally { setBusy(false) }
  }

  return (
    <div role="dialog" aria-label={`Eliminar ${center.name}`} className="mt-4 rounded-xl border border-[#f0d9de] bg-[#fdf5f7] p-4 text-xs">
      <h3 className="text-sm font-semibold text-[#8e1f33]">Eliminar {center.name} ({center.code})</h3>
      {!impact && !error && <p className="mt-2 text-muted">Calculando qué se eliminaría…</p>}
      {error && <p role="alert" className="mt-2 rounded-lg bg-[#f7e0e6] p-2 text-[#8e1f33]">{error}</p>}
      {empty && (
        <div className="mt-2 flex items-center gap-2">
          <span>El centro está vacío.</span>
          <button type="button" disabled={busy} onClick={() => run(() => adminCentersApi.remove(center.code))} className="rounded-lg bg-[#8e1f33] px-3 py-1.5 font-semibold text-white disabled:opacity-50">Eliminar centro</button>
        </div>
      )}
      {impact && !empty && (
        <>
          <p className="mt-2">Se eliminará <strong>definitivamente</strong> todo lo que depende de este centro:</p>
          <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 md:grid-cols-3">
            {nonEmpty.map(([label, count]) => <li key={label}><strong>{count}</strong> {label.toLowerCase()}</li>)}
          </ul>
          {impact.usersDeleted.length > 0 && (
            <p className="mt-2">Cuentas sin otro centro que se eliminarán (o se desactivarán si figuran en datos de otro centro): <strong>{impact.usersDeleted.join(', ')}</strong></p>
          )}
          <p className="mt-2 text-muted">La auditoría se conserva y registra la eliminación. No se puede deshacer.</p>
          {impact.canPurge ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={`Escribe ${center.code} para confirmar`} className="min-w-[220px] rounded-lg border border-border bg-white px-3 py-1.5" />
              <button type="button" disabled={busy || typed.trim().toUpperCase() !== center.code.toUpperCase()} onClick={() => run(() => adminCentersApi.purge(center.code, typed.trim()))} className="rounded-lg bg-[#8e1f33] px-3 py-1.5 font-semibold text-white disabled:opacity-50">Eliminar todo</button>
            </div>
          ) : (
            <p className="mt-3 font-semibold">Solo un superadministrador puede eliminar un centro con contenido.</p>
          )}
        </>
      )}
      <button type="button" onClick={onClose} className="mt-3 text-plum underline">Cancelar</button>
    </div>
  )
}

function ZonesPanel({ centers }: { centers: AdminCenter[] }) {
  const [zones, setZones] = useState<AdminZone[]>([])
  const [selectedCenter, setSelectedCenter] = useState<string>('')
  const [editingCode, setEditingCode] = useState<string | undefined>()
  const [form, setForm] = useState<AdminZoneInput>({ code: '', name: '', centerCode: '' })
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const loadZones = () => adminZonesApi.list().then(setZones).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se han podido cargar las zonas.'))

  useEffect(() => { loadZones() }, [])

  useEffect(() => {
    if (centers.length > 0 && !selectedCenter) setSelectedCenter(centers[0].code)
  }, [centers, selectedCenter])

  useEffect(() => {
    setForm((current) => ({ ...current, centerCode: selectedCenter }))
  }, [selectedCenter])

  const zonesForCenter = zones.filter((zone) => zone.centerCode === selectedCenter)

  const reset = () => {
    setEditingCode(undefined)
    setForm({ code: '', name: '', centerCode: selectedCenter })
    setNotice('')
    setError('')
  }

  const choose = (zone: AdminZone) => {
    setEditingCode(zone.code)
    setSelectedCenter(zone.centerCode)
    setForm({ code: zone.code, name: zone.name, centerCode: zone.centerCode })
    setNotice('')
    setError('')
  }

  const save = async () => {
    if (!selectedCenter) {
      setError('Selecciona un centro para la zona.')
      return
    }
    if (!form.code.trim() || !form.name.trim()) {
      setError('Rellena código y nombre.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const payload: AdminZoneInput = { code: form.code.trim(), name: form.name.trim(), centerCode: selectedCenter }
      if (editingCode) {
        await adminZonesApi.update(editingCode, payload)
        setNotice('Zona actualizada.')
      } else {
        await adminZonesApi.create(payload)
        setNotice('Zona creada.')
      }
      await loadZones()
      reset()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar la zona.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (zone: AdminZone) => {
    if (!confirm(`¿Eliminar la zona ${zone.code}?`)) return
    setError('')
    setNotice('')
    try {
      await adminZonesApi.remove(zone.code)
      await loadZones()
      if (editingCode === zone.code) reset()
      setNotice('Zona eliminada.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido eliminar la zona.')
    }
  }

  return (
    <section className={`mt-4 ${card}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Zonas por centro</h2>
          <p className="mt-1 text-xs text-muted">
            Crea, renombra o elimina las zonas (naves, salas…) que pertenecen a un centro.
          </p>
        </div>
        <label className="text-xs font-semibold">
          Centro
          <select
            value={selectedCenter}
            onChange={(event) => { setSelectedCenter(event.target.value); reset() }}
            className="ml-2 rounded-xl border border-border bg-field px-3 py-2 text-xs font-semibold text-ink"
          >
            {centers.map((center) => (
              <option key={center.code} value={center.code}>{center.name}</option>
            ))}
          </select>
        </label>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#f7e0e6] p-3 text-xs text-[#8e1f33]">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-xl bg-[#dceadf] p-3 text-xs text-[#1f5c3a]">{notice}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <h3 className="text-xs font-semibold">{editingCode ? `Editar zona ${editingCode}` : 'Nueva zona'}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              Código
              <input
                value={form.code}
                onChange={(event) => setForm({ ...form, code: event.target.value })}
                placeholder="NAVE-A"
                className="mt-1 w-full rounded-xl border border-border p-2 text-xs"
              />
            </label>
            <label className="text-xs font-semibold">
              Nombre
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Nave A"
                className="mt-1 w-full rounded-xl border border-border p-2 text-xs"
              />
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              disabled={busy}
              onClick={save}
              className="rounded-xl bg-plum px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              {editingCode ? 'Guardar cambios' : 'Crear zona'}
            </button>
            {editingCode && (
              <button onClick={reset} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold">
                Cancelar
              </button>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold">Zonas del centro</h3>
          <div className="mt-3 space-y-2">
            {zonesForCenter.length === 0 && (
              <p className="rounded-xl border border-border p-3 text-xs text-muted">
                Este centro aún no tiene zonas definidas.
              </p>
            )}
            {zonesForCenter.map((zone) => (
              <div key={zone.code} className="flex items-center justify-between rounded-xl border border-border p-3 text-xs">
                <span>
                  <b>{zone.name}</b>
                  <span className="ml-2 font-mono text-muted">{zone.code}</span>
                </span>
                <span className="flex gap-2">
                  <button onClick={() => choose(zone)} className="text-plum">Modificar</button>
                  <button onClick={() => remove(zone)} className="text-[#8e1f33]">Eliminar</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CatalogsTab() {
  return (
    <section className={`mt-4 ${card}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Catálogos</h2>
          <p className="mt-1 text-xs text-muted">
            Crea, desactiva o elimina los valores de los catálogos. Las entradas desactivadas dejan de
            mostrarse en el selector, pero pueden restaurarse desde aquí.
          </p>
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-[#f5eed0] p-3 text-[11px] text-[#6b5a10]">
        Para modificar el nombre o el código de una entrada existente, desactívala y crea una nueva con
        los valores correctos: el backend no expone un endpoint de renombrado.
      </p>
      <div className="mt-4 space-y-4">
        {catalogResources.map((resource) => (
          <CatalogPanel key={resource.path} resource={resource} />
        ))}
      </div>
    </section>
  )
}

interface CatalogPanelProps {
  resource: (typeof catalogResources)[number]
}

function CatalogPanel({ resource }: CatalogPanelProps) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [form, setForm] = useState({ code: '', name: '', description: '' })
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')

  const load = () => catalogApi.list(resource.path, { includeInactive: true }).then(setItems).catch((cause) => setError(cause instanceof Error ? cause.message : 'No se ha podido cargar el catálogo.'))

  useEffect(() => {
    load()
  }, [resource.path])

  const reset = () => {
    setForm({ code: '', name: '', description: '' })
    setNotice('')
    setError('')
  }

  const create = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError('Rellena código y nombre.')
      return
    }
    if (resource.hasDescription && !form.description.trim()) {
      setError('Rellena la descripción.')
      return
    }
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await catalogApi.create(resource.path, {
        code: form.code.trim(),
        name: form.name.trim(),
        description: resource.hasDescription ? form.description.trim() : undefined,
      })
      setNotice('Entrada creada.')
      reset()
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido crear la entrada.')
    } finally {
      setBusy(false)
    }
  }

  const toggleActive = async (item: CatalogItem) => {
    setError('')
    setNotice('')
    try {
      await catalogApi.setActive(resource.path, item.id, !item.active)
      setNotice(item.active ? 'Entrada desactivada.' : 'Entrada reactivada.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido cambiar el estado.')
    }
  }

  const remove = async (item: CatalogItem) => {
    if (!confirm(`¿Eliminar definitivamente ${item.name}? Esta acción no se puede deshacer.`)) return
    setError('')
    setNotice('')
    try {
      await catalogApi.remove(resource.path, item.id)
      setNotice('Entrada eliminada.')
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido eliminar la entrada.')
    }
  }

  return (
    <div className="rounded-2xl border border-border">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border p-3">
        <h3 className="text-sm font-semibold">{resource.label}</h3>
        <span className="text-[10.5px] text-muted">{items.filter((item) => item.active).length} activas de {items.length}</span>
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-[11px] font-semibold text-muted">
            Código
            <input
              value={form.code}
              onChange={(event) => setForm({ ...form, code: event.target.value })}
              placeholder="Ej. TEMPRANILLO"
              className="mt-1 w-full rounded-xl border border-border p-2 text-xs font-mono"
            />
          </label>
          <label className="text-[11px] font-semibold text-muted">
            Nombre
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Ej. Tempranillo"
              className="mt-1 w-full rounded-xl border border-border p-2 text-xs"
            />
          </label>
          {resource.hasDescription && (
            <label className="text-[11px] font-semibold text-muted">
              Descripción
              <input
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Detalle breve"
                className="mt-1 w-full rounded-xl border border-border p-2 text-xs"
              />
            </label>
          )}
        </div>
        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="min-h-9 rounded-xl bg-plum px-3 text-[12px] font-semibold text-white hover:bg-plum-dark disabled:opacity-50"
        >
          Añadir
        </button>
      </div>
      {(error || notice) && (
        <div className="mx-3 mb-3">
          {error && <p role="alert" className="rounded-xl bg-[#f7e0e6] p-2 text-[11.5px] text-[#8e1f33]">{error}</p>}
          {notice && <p role="status" className="rounded-xl bg-[#dceadf] p-2 text-[11.5px] text-[#1f5c3a]">{notice}</p>}
        </div>
      )}
      <div className="border-t border-border">
        {items.length === 0 ? (
          <p className="p-3 text-[11.5px] text-muted">Sin entradas activas.</p>
        ) : (
          <ul>
            {items.map((item, index) => (
              <li
                key={item.id}
                className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs ${index > 0 ? 'border-t border-border' : ''}`}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <b>{item.name}</b>
                  <span className="font-mono text-muted">{item.code}</span>
                  {item.description && <span className="text-muted">— {item.description}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold leading-tight tracking-wide ${
                      item.active ? 'bg-[#dceadf] text-[#1f5c3a]' : 'bg-[#efeff5] text-[#43435c]'
                    }`}
                  >
                    {item.active ? 'Activa' : 'Inactiva'}
                  </span>
                  <button type="button" onClick={() => toggleActive(item)} className="text-plum hover:underline">
                    {item.active ? 'Desactivar' : 'Reactivar'}
                  </button>
                  {resource.deletable && (
                    <button type="button" onClick={() => remove(item)} className="text-[#8e1f33] hover:underline">
                      Eliminar
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [centers, setCenters] = useState<AdminCenter[]>([])
  const [selected, setSelected] = useState<AdminUser | undefined>()
  const [editing, setEditing] = useState<AdminUser | undefined>()
  const [selectedCenters, setSelectedCenters] = useState<string[]>([])
  const [form, setForm] = useState<CreateAdminUserInput>({
    username: '',
    email: '',
    firstName: '',
    lastName: '',
    jobTitle: '',
    password: '',
    centerCodes: [],
    roleCodes: [],
  })
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([])
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () =>
    Promise.all([adminUsersApi.list(), adminCentersApi.list()]).then(([list, centerList]) => {
      setUsers(list)
      setCenters(centerList)
    })

  useEffect(() => { load(); adminAccountsApi.listRoles().then(setRoleOptions).catch(() => undefined) }, [])

  const choose = (user: AdminUser) => {
    setSelected(user)
    setEditing(user)
    setSelectedCenters(user.centers.map((c) => c.code))
    setNotice('')
    setError('')
  }

  const resetForm = () => {
    setEditing(undefined)
    setSelected(undefined)
    setSelectedCenters([])
    setForm({ username: '', email: '', firstName: '', lastName: '', jobTitle: '', password: '', centerCodes: [], roleCodes: [] })
    setNotice('')
    setError('')
  }

  const save = async () => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (editing) {
        if (selectedCenters.length === 0) {
          setError('Selecciona al menos un centro.')
          return
        }
        const updated = await adminUsersApi.updateCenters(editing.username, selectedCenters)
        setUsers((items) => items.map((item) => (item.username === updated.username ? updated : item)))
        setSelected(updated)
        setEditing(updated)
        setNotice('Centros actualizados.')
      } else {
        if (!form.username || !form.email || !form.firstName || !form.password) {
          setError('Rellena usuario, email, nombre y contraseña.')
          return
        }
        if (form.centerCodes.length === 0) {
          setError('Selecciona al menos un centro.')
          return
        }
        const created = await adminUsersApi.create(form)
        await load()
        setSelected(created)
        setEditing(created)
        setSelectedCenters(created.centers.map((c) => c.code))
        setNotice('Usuario creado.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar.')
    } finally {
      setBusy(false)
    }
  }

  const allCentersUnique = Array.from(
    new Map(users.flatMap((user) => user.centers).map((center) => [center.code, center])).values(),
  )
  const availableCenters = centers.length > 0 ? centers : allCentersUnique

  return (
    <section className={`mt-4 ${card}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Usuarios</h2>
          <p className="mt-1 text-xs text-muted">
            Gestión de todas las cuentas de la aplicación. Solo accesible para administradores.
          </p>
        </div>
        <button onClick={resetForm} className="rounded-xl bg-plum px-3 py-2 text-xs font-semibold text-white">
          + Nuevo usuario
        </button>
      </div>
      {error && <p role="alert" className="mt-3 rounded-xl bg-[#f7e0e6] p-3 text-xs text-[#8e1f33]">{error}</p>}
      {notice && <p role="status" className="mt-3 rounded-xl bg-[#dceadf] p-3 text-xs text-[#1f5c3a]">{notice}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
        <div className="space-y-1">
          {users.length === 0 && <p className="text-xs text-muted">Sin usuarios registrados.</p>}
          {users.map((user) => (
            <button
              key={user.username}
              onClick={() => choose(user)}
              className={`w-full rounded-xl p-3 text-left text-xs ${
                selected?.username === user.username ? 'bg-plum-soft text-plum' : 'hover:bg-field'
              }`}
            >
              {user.displayName}
              <span className="mt-1 block text-[10px] text-muted">
                {user.email}
              </span>
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-border p-4">
          {editing ? (
            <div>
              <p className="font-semibold text-sm">{editing.displayName}</p>
              <p className="mt-1 text-xs text-muted">{editing.email}</p>
              <h3 className="mt-5 text-xs font-semibold">Centros asignados</h3>
              <div className="mt-2 space-y-2">
                {availableCenters.map((center) => (
                  <label key={center.code} className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs">
                    <input
                      type="checkbox"
                      checked={selectedCenters.includes(center.code)}
                      onChange={(event) =>
                        setSelectedCenters((current) =>
                          event.target.checked
                            ? [...current, center.code]
                            : current.filter((code) => code !== center.code),
                        )
                      }
                    />
                    {center.name}
                  </label>
                ))}
              </div>
              <button
                disabled={busy || selectedCenters.length === 0}
                onClick={save}
                className="mt-4 rounded-xl bg-plum px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Guardar centros
              </button>
              <UserAccessPanel username={editing.username} />
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-muted">Crear nueva cuenta</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Usuario" value={form.username} onChange={(value) => setForm({ ...form, username: value })} />
                <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} />
                <Field label="Nombre" value={form.firstName} onChange={(value) => setForm({ ...form, firstName: value })} />
                <Field label="Apellidos" value={form.lastName ?? ''} onChange={(value) => setForm({ ...form, lastName: value })} />
                <Field label="Puesto" value={form.jobTitle ?? ''} onChange={(value) => setForm({ ...form, jobTitle: value })} />
                <Field label="Contraseña" type="password" value={form.password} onChange={(value) => setForm({ ...form, password: value })} />
              </div>
              <h3 className="mt-5 text-xs font-semibold">Centros asignados</h3>
              <div className="mt-2 space-y-2">
                {availableCenters.map((center) => (
                  <label key={center.code} className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs">
                    <input
                      type="checkbox"
                      checked={form.centerCodes.includes(center.code)}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          centerCodes: event.target.checked
                            ? [...form.centerCodes, center.code]
                            : form.centerCodes.filter((code) => code !== center.code),
                        })
                      }
                    />
                    {center.name}
                  </label>
                ))}
              </div>
              <h3 className="mt-5 text-xs font-semibold">Roles</h3>
              <p className="mt-1 text-[11px] text-muted">Si no marcas ninguno, se crea como Consulta (solo lectura).</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {roleOptions.map((role) => (
                  <label key={role.code} className="flex items-center gap-2 rounded-lg border border-border p-2 text-xs">
                    <input
                      type="checkbox"
                      checked={(form.roleCodes ?? []).includes(role.code)}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          roleCodes: event.target.checked
                            ? [...(form.roleCodes ?? []), role.code]
                            : (form.roleCodes ?? []).filter((code) => code !== role.code),
                        })
                      }
                    />
                    {role.name}
                  </label>
                ))}
              </div>
              <button
                disabled={busy}
                onClick={save}
                className="mt-5 rounded-xl bg-plum px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Crear usuario
              </button>
            </div>
          )}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted">
        El primer centro seleccionado se conserva como centro principal de acceso.
      </p>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
}) {
  return (
    <label className="text-xs font-semibold">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-xl border border-border p-2 text-xs"
      />
    </label>
  )
}
