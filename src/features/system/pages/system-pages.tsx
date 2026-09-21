import { useEffect, useState, type ReactNode } from 'react'
import { Bell, Check } from 'lucide-react'
import { adminAuditApi, type AuditEntry } from '../services/admin-audit-api'

const card = 'rounded-2xl border border-border bg-white p-4'

export function ReportsPage() {
  const [type, setType] = useState('Trazabilidad')
  const [generated, setGenerated] = useState(false)
  return (
    <div className="mx-auto grid max-w-6xl gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className={card}>
        <h1 className="text-lg font-semibold">Nuevo informe</h1>
        <label className="mt-4 block text-xs font-semibold">Tipo
          <select value={type} onChange={(event) => setType(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-field p-3 text-sm font-normal text-ink">
            <option>Trazabilidad</option>
            <option>Ficha de contenido</option>
            <option>Analíticas</option>
          </select>
        </label>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Field label="Desde" value="01 sep" />
          <Field label="Hasta" value="16 sep" />
        </div>
        <button onClick={() => setGenerated(true)} className="mt-5 w-full rounded-xl bg-plum py-3 text-xs font-semibold text-white">
          Generar informe
        </button>
      </aside>
      <main className="space-y-4">
        <section className={card}>
          <h2 className="text-lg font-semibold">Previsualización</h2>
          <div className="mt-4 rounded-xl border border-border p-4">
            <h3 className="font-semibold">Informe de {type} · Centro Norte</h3>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
              <Metric label="Periodo" value="1–16 sep 2026" />
              <Metric label="Generado" value="16 sep 09:30" />
              <Metric label="Autor" value="María Solana" />
              <Metric label="Registros" value="214" />
            </dl>
          </div>
        </section>
        {generated && <Notice text="Informe generado y añadido a la lista de trabajos." />}
      </main>
    </div>
  )
}

export function AccountPage() {
  const [read, setRead] = useState(false)
  return (
    <SimplePage
      title="Cuenta y sincronización"
      subtitle="Configuración personal y de notificaciones."
      rows={[['Sincronización', 'Centro Norte sincronizado', 'Hoy']]}
      action={
        <button onClick={() => setRead(!read)} className="rounded-xl bg-plum px-3 py-2 text-xs font-semibold text-white">
          <Bell className="mr-1 inline size-3.5" />{read ? 'Marcados como leídos' : 'Marcar como leído'}
        </button>
      }
    />
  )
}

export function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    adminAuditApi.list().then(setEntries).catch((cause) =>
      setError(cause instanceof Error ? cause.message : 'No se ha podido cargar la auditoría.'),
    )
  }, [])
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <section className={card}>
        <h1 className="text-lg font-semibold">Auditoría y versiones</h1>
        <p className="mt-1 text-xs text-muted">Cambios trazables, correcciones y evidencia vigente.</p>
        {error && <p role="alert" className="mt-3 text-xs text-[#8e1f33]">{error}</p>}
        <div className="mt-4 space-y-2">
          {entries.map((entry, index) => (
            <div key={`${entry.createdAt}-${index}`} className="rounded-xl border border-border p-3 text-xs">
              <div className="flex justify-between gap-3">
                <strong>{entry.entityName} · {entry.action}</strong>
                <span className="text-muted">{new Date(entry.createdAt).toLocaleString('es-ES')}</span>
              </div>
              <p className="mt-1 text-muted">{entry.reason || 'Sin motivo indicado'} · {entry.author}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange?: (value: string) => void }) {
  const input = 'mt-1 w-full rounded-xl border border-border bg-field p-3 text-sm font-normal text-ink'
  return (
    <label className="mt-3 block text-xs font-semibold text-copy">
      {label}
      <input value={value} onChange={(event) => onChange?.(event.target.value)} readOnly={!onChange} className={input} />
    </label>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] text-muted">{label}</dt>
      <dd className="mt-1 text-xs font-semibold">{value}</dd>
    </div>
  )
}

function Notice({ text }: { text: string }) {
  return (
    <p role="status" className="mt-3 rounded-xl bg-[#dceadf] p-3 text-xs text-[#1f5c3a]">
      <Check className="mr-1 inline size-3.5" />{text}
    </p>
  )
}

function SimplePage({ title, subtitle, rows, action }: { title: string; subtitle: string; rows: string[][]; action?: ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <header className={card}>
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">{title}</h1>
            <p className="mt-1 text-xs text-muted">{subtitle}</p>
          </div>
          {action}
        </div>
      </header>
      <section className={card}>
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row[0]} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
              <div>
                <p className="text-sm font-semibold">{row[0]}</p>
                <p className="mt-1 text-xs text-copy">{row[1]}</p>
              </div>
              <span className="font-mono text-[11px] text-muted">{row[2]}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}