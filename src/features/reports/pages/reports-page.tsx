import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, Download, Eye, FileSpreadsheet, FileText, Loader2, RefreshCw, X } from 'lucide-react'
import { useResource } from '../../../hooks/use-resource'
import { useCan } from '../../../hooks/use-permissions'
import { formatDateTime, todayInCenter } from '../../../lib/format'
import { MultiSelect } from '../../tracking/components/multi-select'
import { reportsApi, saveBlob, type ReportFilters, type ReportJob, type ReportOptions, type ReportPeriod } from '../services/reports-api'
import { matchingDeposits } from '../utils'

const card = 'rounded-2xl border border-border bg-white p-4'
const input = 'mt-1 w-full rounded-xl border border-border bg-field px-3 py-2 text-sm font-normal text-ink outline-none focus:border-plum'
const PAGE_SIZE = 15

const PERIODS: Array<{ value: ReportPeriod; label: string; hint: string }> = [
  { value: 'DEPOSIT_ENTRY', label: 'Desde la entrada en el depósito', hint: 'Cada depósito desde que entró su contenido actual.' },
  { value: 'CONTENT_START', label: 'Desde el inicio del contenido', hint: 'Incluye lo ocurrido en depósitos anteriores (antes de un trasiego).' },
  { value: 'RANGE', label: 'Entre fechas', hint: 'Mismo periodo para todos los depósitos.' },
]

interface Props {
  /** Deposit preselected when the page is opened from a deposit (#reports?deposit=CODE). */
  initialDeposit?: string
}

/** UI23 · Informes: issue a cellar-status report (PDF + raw Excel) and list the ones already issued. */
export function ReportsPage({ initialDeposit }: Props) {
  const canExport = useCan('REPORT_EXPORT')
  const options = useResource(() => reportsApi.options(), [])
  const [filters, setFilters] = useState<ReportFilters>(() => ({
    zones: [], deposits: initialDeposit ? [initialDeposit] : [], phases: [], categories: [], period: 'DEPOSIT_ENTRY', from: null, to: null,
  }))
  const [title, setTitle] = useState('')
  const [includeProvisional, setIncludeProvisional] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [issued, setIssued] = useState<ReportJob>()
  const [jobs, setJobs] = useState<ReportJob[]>([])
  const [total, setTotal] = useState(0)
  const [listError, setListError] = useState('')
  const [loadingList, setLoadingList] = useState(true)
  const [preview, setPreview] = useState<{ code: string; url: string }>()

  const loadJobs = async (page = 0) => {
    setLoadingList(true)
    setListError('')
    try {
      const result = await reportsApi.list(page, PAGE_SIZE)
      setJobs((current) => (page === 0 ? result.items : [...current, ...result.items]))
      setTotal(result.total)
    } catch (cause) {
      setListError(cause instanceof Error ? cause.message : 'No se ha podido cargar la lista de informes.')
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => { void loadJobs(0) }, [])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url) }, [preview])

  const matching = useMemo(() => matchingDeposits(options.data, filters), [options.data, filters])
  const rangeInvalid = filters.period === 'RANGE' && !!filters.from && !!filters.to && filters.from > filters.to

  const generate = async () => {
    setGenerating(true)
    setError('')
    setIssued(undefined)
    try {
      const job = await reportsApi.create({
        type: 'CELLAR_STATUS',
        title: title.trim() || undefined,
        filters: filters.period === 'RANGE' ? filters : { ...filters, from: null, to: null },
        includeProvisional,
      })
      setIssued(job)
      await loadJobs(0)
      if (job.status === 'AVAILABLE') await openPreview(job)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido generar el informe.')
    } finally {
      setGenerating(false)
    }
  }

  const openPreview = async (job: ReportJob) => {
    try {
      const { blob } = await reportsApi.file(job.code, 'pdf')
      setPreview({ code: job.code, url: URL.createObjectURL(new Blob([blob], { type: 'application/pdf' })) })
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido abrir la vista previa.')
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className={`${card} self-start`}>
        <h1 className="text-lg font-semibold">Nuevo informe</h1>
        <p className="mt-1 text-xs text-muted">
          Estado de bodega: resumen por fase y, para cada depósito, gráficas y tablas de las analíticas de cada fase por la que ha pasado.
          Se genera un PDF para leer e imprimir y un Excel con todos los datos en bruto.
        </p>
        {options.error && <p role="alert" className="mt-3 text-xs text-[#8e1f33]">{options.error}</p>}

        <label className="mt-4 block text-xs font-semibold text-copy">Título
          <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} placeholder="Estado de bodega" className={input} />
        </label>

        <fieldset className="mt-4 space-y-3">
          <legend className="text-xs font-semibold text-copy">Alcance <span className="font-normal text-muted">· vacío = todo</span></legend>
          <ScopeSelectors options={options.data} filters={filters} onChange={setFilters} />
        </fieldset>

        <fieldset className="mt-4">
          <legend className="text-xs font-semibold text-copy">Periodo de las analíticas</legend>
          <div className="mt-1 space-y-1.5">
            {PERIODS.map((period) => (
              <label key={period.value} className={`flex cursor-pointer gap-2 rounded-xl border p-2.5 text-xs ${filters.period === period.value ? 'border-plum bg-plum-soft' : 'border-border'}`}>
                <input type="radio" name="period" checked={filters.period === period.value} onChange={() => setFilters({ ...filters, period: period.value })} className="mt-0.5 accent-[#6d4656]" />
                <span><span className="font-semibold">{period.label}</span><span className="block text-[11px] text-muted">{period.hint}</span></span>
              </label>
            ))}
          </div>
          {filters.period === 'RANGE' && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold text-copy">Desde
                <input type="date" value={filters.from ?? ''} max={todayInCenter()} onChange={(event) => setFilters({ ...filters, from: event.target.value || null })} className={input} />
              </label>
              <label className="text-xs font-semibold text-copy">Hasta
                <input type="date" value={filters.to ?? ''} max={todayInCenter()} onChange={(event) => setFilters({ ...filters, to: event.target.value || null })} className={input} />
              </label>
              {rangeInvalid && <p role="alert" className="col-span-2 text-[11px] text-[#8e1f33]">La fecha inicial debe ser anterior a la final.</p>}
            </div>
          )}
        </fieldset>

        <label className="mt-4 flex items-start gap-2 rounded-xl border border-border p-2.5 text-xs">
          <input type="checkbox" checked={includeProvisional} onChange={(event) => setIncludeProvisional(event.target.checked)} className="mt-0.5 accent-[#6d4656]" />
          <span><span className="font-semibold">Incluir resultados provisionales</span>
            <span className="block text-[11px] text-muted">Sin validar. Aparecen marcados (punto hueco, asterisco, «prov.»).</span></span>
        </label>

        <p className="mt-4 rounded-xl bg-field p-3 text-xs text-copy">
          {options.loading ? 'Calculando alcance…' : matching === 0
            ? 'Ningún depósito con contenido encaja con este alcance.'
            : <><strong>{matching}</strong> {matching === 1 ? 'depósito con contenido entrará' : 'depósitos con contenido entrarán'} en el informe.</>}
        </p>

        {error && <p role="alert" className="mt-3 flex gap-1.5 rounded-xl bg-[#f7e0e6] p-3 text-xs text-[#8e1f33]"><AlertCircle className="size-3.5 shrink-0" />{error}</p>}
        <button type="button" onClick={generate} disabled={!canExport || generating || rangeInvalid || options.loading}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-plum text-xs font-semibold text-white disabled:opacity-60">
          {generating ? <><Loader2 className="size-4 animate-spin" />Generando informe…</> : <><FileText className="size-4" />Generar PDF y Excel</>}
        </button>
        {!canExport && <p className="mt-2 text-[11px] text-muted">Necesitas el permiso «Generar informes y exportar datos».</p>}
      </aside>

      <main className="min-w-0 space-y-4">
        {issued && <IssuedCard job={issued} onClose={() => setIssued(undefined)} canExport={canExport} onError={setError} />}

        {preview && (
          <section className={card}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Vista previa · <span className="font-mono">{preview.code}</span></h2>
              <button type="button" onClick={() => setPreview(undefined)} aria-label="Cerrar vista previa" className="rounded-lg p-1.5 hover:bg-plum-soft"><X className="size-4" /></button>
            </div>
            <iframe title={`Informe ${preview.code}`} src={preview.url} className="mt-3 h-[75vh] w-full rounded-xl border border-border bg-field" />
          </section>
        )}

        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Informes emitidos</h2>
              <p className="mt-0.5 text-xs text-muted">Un informe emitido no cambia: si se corrigen datos, genera uno nuevo. {total > 0 && `${total} en total.`}</p>
            </div>
            <button type="button" onClick={() => void loadJobs(0)} className="flex min-h-9 items-center gap-1 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-plum-soft"><RefreshCw className="size-3.5" />Actualizar</button>
          </div>
          {listError && <p role="alert" className="mt-3 text-xs text-[#8e1f33]">{listError}</p>}
          {!loadingList && jobs.length === 0 && !listError && <p className="mt-4 rounded-xl bg-field p-6 text-center text-xs text-muted">Aún no se ha emitido ningún informe.</p>}
          <ul className="mt-3 divide-y divide-border">
            {jobs.map((job) => (
              <JobRow key={job.code} job={job} canExport={canExport} active={preview?.code === job.code}
                onPreview={() => void openPreview(job)} onError={setError} />
            ))}
          </ul>
          {loadingList && <p className="p-4 text-center text-xs text-muted">Cargando…</p>}
          {!loadingList && jobs.length < total && (
            <button type="button" onClick={() => void loadJobs(Math.floor(jobs.length / PAGE_SIZE))} className="mt-2 w-full rounded-xl border border-border py-2 text-xs font-semibold text-plum">Ver más</button>
          )}
        </section>
      </main>
    </div>
  )
}

function ScopeSelectors({ options, filters, onChange }: { options?: ReportOptions; filters: ReportFilters; onChange: (filters: ReportFilters) => void }) {
  const phaseName = new Map((options?.phases ?? []).map((phase) => [phase.code, phase.name]))
  const depositOptions = (options?.deposits ?? []).map((deposit) => ({
    value: deposit.code,
    label: deposit.code,
    hint: deposit.content ? (deposit.phase === 'NONE' ? 'sin fase' : phaseName.get(deposit.phase ?? '') ?? deposit.content) : 'vacío',
  }))
  const phaseOptions = [
    ...(options?.phases ?? []).filter((phase) => phase.active).map((phase) => ({ value: phase.code, label: phase.name })),
    { value: 'NONE', label: 'Sin fase asignada' },
  ]
  return (
    <>
      <MultiSelect label="Zonas" options={(options?.zones ?? []).map((zone) => ({ value: zone.code, label: zone.name, hint: zone.code }))}
        selected={filters.zones} onChange={(zones) => onChange({ ...filters, zones })} placeholder="Todas" />
      <MultiSelect label="Depósitos" options={depositOptions} selected={filters.deposits}
        onChange={(deposits) => onChange({ ...filters, deposits })} placeholder="Todos" bulk />
      <MultiSelect label="Fase actual" options={phaseOptions} selected={filters.phases}
        onChange={(phases) => onChange({ ...filters, phases })} placeholder="Todas" />
      <MultiSelect label="Categoría" options={(options?.categories ?? []).map((category) => ({ value: category.code, label: category.name }))}
        selected={filters.categories} onChange={(categories) => onChange({ ...filters, categories })} placeholder="Todas" />
    </>
  )
}

function IssuedCard({ job, onClose, canExport, onError }: { job: ReportJob; onClose: () => void; canExport: boolean; onError: (message: string) => void }) {
  const ok = job.status === 'AVAILABLE'
  return (
    <section role="status" className={`rounded-2xl border p-4 ${ok ? 'border-[#bcd8c4] bg-[#f1f8f3]' : 'border-[#e4b9c3] bg-[#fdf5f7]'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`flex items-center gap-1.5 text-sm font-semibold ${ok ? 'text-[#1f5c3a]' : 'text-[#8e1f33]'}`}>
            {ok ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
            {ok ? `Informe ${job.code} emitido` : `No se ha podido generar ${job.code}`}
          </p>
          <p className="mt-1 text-xs text-copy">
            {ok ? `${job.depositCount ?? 0} depósitos · ${job.recordCount ?? 0} registros analíticos · ${job.scope}` : job.error}
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-lg p-1.5 hover:bg-white"><X className="size-4" /></button>
      </div>
      {ok && canExport && <div className="mt-3 flex flex-wrap gap-2"><DownloadButtons job={job} onError={onError} primary /></div>}
    </section>
  )
}

function JobRow({ job, canExport, active, onPreview, onError }: { job: ReportJob; canExport: boolean; active: boolean; onPreview: () => void; onError: (message: string) => void }) {
  return (
    <li className={`flex flex-wrap items-center justify-between gap-3 py-3 ${active ? 'bg-plum-soft/40' : ''}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">{job.title}</span>
          <span className="font-mono text-[11px] text-muted">{job.code}</span>
          <StatusBadge status={job.status} />
          {job.includeProvisional && <span className="rounded-full bg-[#f8ebcc] px-2 py-0.5 text-[10.5px] font-semibold text-[#7a5410]">con provisionales</span>}
        </div>
        <p className="mt-0.5 truncate text-xs text-copy" title={job.scope}>{job.scope}</p>
        <p className="mt-0.5 text-[11px] text-muted">
          {formatDateTime(job.createdAt)} · {job.author}
          {job.status === 'AVAILABLE' && ` · ${job.depositCount ?? 0} depósitos · ${job.recordCount ?? 0} registros`}
          {job.status === 'FAILED' && job.error && ` · ${job.error}`}
        </p>
      </div>
      {job.status === 'AVAILABLE' && canExport && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onPreview} className="flex min-h-9 items-center gap-1 rounded-xl border border-border px-3 text-xs font-semibold hover:bg-plum-soft"><Eye className="size-3.5" />Ver</button>
          <DownloadButtons job={job} onError={onError} />
        </div>
      )}
    </li>
  )
}

function DownloadButtons({ job, onError, primary = false }: { job: ReportJob; onError: (message: string) => void; primary?: boolean }) {
  const [busy, setBusy] = useState<'pdf' | 'xlsx'>()
  const download = async (format: 'pdf' | 'xlsx') => {
    setBusy(format)
    try {
      const { blob, fileName } = await reportsApi.file(job.code, format)
      saveBlob(blob, fileName ?? `${job.code}.${format}`)
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : 'No se ha podido descargar el fichero.')
    } finally {
      setBusy(undefined)
    }
  }
  const base = 'flex min-h-9 items-center gap-1 rounded-xl px-3 text-xs font-semibold disabled:opacity-60'
  return (
    <>
      {job.pdf && (
        <button type="button" onClick={() => void download('pdf')} disabled={!!busy} className={`${base} ${primary ? 'bg-plum text-white' : 'border border-border hover:bg-plum-soft'}`}>
          {busy === 'pdf' ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}PDF
        </button>
      )}
      {job.xlsx && (
        <button type="button" onClick={() => void download('xlsx')} disabled={!!busy} className={`${base} border border-border bg-white hover:bg-plum-soft`}>
          {busy === 'xlsx' ? <Loader2 className="size-3.5 animate-spin" /> : <FileSpreadsheet className="size-3.5" />}Excel
        </button>
      )}
    </>
  )
}

function StatusBadge({ status }: { status: ReportJob['status'] }) {
  const style = status === 'AVAILABLE' ? 'bg-[#dceadf] text-[#1f5c3a]' : status === 'FAILED' ? 'bg-[#f7e0e6] text-[#8e1f33]' : 'bg-plum-soft text-plum'
  const text = status === 'AVAILABLE' ? 'Disponible' : status === 'FAILED' ? 'Error' : 'Preparando'
  return <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${style}`}>{text}</span>
}
