import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, Check, CheckCircle2, ClipboardPaste, Copy, CopyCheck, Plus, Save, Trash2, X } from 'lucide-react'
import { DataSheetGrid, keyColumn, textColumn } from 'react-datasheet-grid'
import 'react-datasheet-grid/dist/style.css'
import { trackingApi } from '../../tracking/services/tracking-api'
import { importApi, type ImportResponse, type ImportRowResult, type ImportTemplate } from '../services/import-api'
import {
  applyTemplate, buildRows, guessMapping, looksLikeHeader, parseClipboard, templateFits,
  type ColumnTarget, type SheetRow,
} from '../import-sheet'

interface Props { onBack: () => void }

const EMPTY_COLUMNS = 6
const DEBOUNCE_MS = 500
const DEFAULT_TEMPLATE_NAME = 'Hoja del analizador'

/** One editable record per grid row; cell keys are c0, c1… so columns grow with the paste. */
interface GridRow {
  /** Stable id: warnings keep pointing at the same row while it is edited or reordered. */
  __ref?: number
  /** Live status of the row, kept in the row itself: the grid only re-renders a cell when its data changes. */
  __status?: string
  __statusKind?: string
  [cell: string]: string | number | undefined
}

export function ImportAnalysisPage({ onBack }: Props) {
  const [headers, setHeaders] = useState<string[]>(() => Array.from({ length: EMPTY_COLUMNS }, () => ''))
  const [mapping, setMapping] = useState<ColumnTarget[]>(() => Array.from({ length: EMPTY_COLUMNS }, () => 'ignore'))
  const [rows, setRows] = useState<GridRow[]>(() => emptyRows(3))
  const [parameters, setParameters] = useState<{ code: string; name: string }[]>([])
  const [preview, setPreview] = useState<ImportResponse>()
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<ImportResponse>()
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [templates, setTemplates] = useState<ImportTemplate[]>([])
  const [templateName, setTemplateName] = useState(DEFAULT_TEMPLATE_NAME)
  const [notice, setNotice] = useState('')
  const nextRef = useRef(1)
  const lastChecked = useRef('')
  // The template list is read once; the paste handler needs the latest one without being re-created.
  const templatesRef = useRef<ImportTemplate[]>([])
  templatesRef.current = templates

  useEffect(() => {
    void trackingApi.parameters(true)
      .then(items => setParameters(items.map(item => ({ code: item.code, name: item.name }))))
      .catch(() => setParameters([]))
    void importApi.templates()
      .then(items => { setTemplates(items); if (items[0]) setTemplateName(items[0].name) })
      .catch(() => setTemplates([]))
  }, [])

  const sheet: SheetRow[] = useMemo(() => rows.map((row, index) => ({
    reference: row.__ref ?? index,
    cells: headers.map((_, column) => String(row[`c${column}`] ?? '')),
  })), [rows, headers])

  const built = useMemo(() => buildRows(sheet, mapping), [sheet, mapping])

  // Live check against the server: same rules as the import, so warnings match what will happen.
  useEffect(() => {
    if (built.rows.length === 0) { setPreview(undefined); return }
    const payload = JSON.stringify(built.rows)
    if (payload === lastChecked.current) return
    const timer = setTimeout(() => {
      lastChecked.current = payload
      setChecking(true)
      importApi.preview(built.rows)
        .then(response => { setPreview(response); setError('') })
        .catch(cause => setError(cause instanceof Error ? cause.message : 'No se ha podido comprobar la tabla.'))
        .finally(() => setChecking(false))
    }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [built.rows])

  const issueByRow = useMemo(() => {
    const map = new Map<number, { kind: string; message: string }>()
    built.issues.forEach(issue => map.set(issue.reference, { kind: issue.kind, message: issue.message }))
    preview?.rows.forEach(row => {
      if (row.status !== 'OK') map.set(row.reference, { kind: row.status, message: row.message ?? '' })
    })
    return map
  }, [built.issues, preview])

  const okRows = useMemo(
    () => built.rows.filter(row => !issueByRow.has(row.reference)),
    [built.rows, issueByRow],
  )

  const checkedRefs = useMemo(
    () => new Set([...built.rows.map(row => row.reference), ...built.issues.map(issue => issue.reference)]),
    [built.rows, built.issues],
  )

  useEffect(() => {
    setRows(current => {
      let changed = false
      const updated = current.map(row => {
        const issue = row.__ref === undefined ? undefined : issueByRow.get(row.__ref)
        const kind = issue ? issue.kind : row.__ref !== undefined && checkedRefs.has(row.__ref) ? 'OK' : ''
        const message = issue ? issue.message : ''
        if (row.__status === message && row.__statusKind === kind) return row
        changed = true
        return { ...row, __status: message, __statusKind: kind }
      })
      return changed ? updated : current
    })
  }, [issueByRow, checkedRefs])

  const applyPaste = useCallback((text: string) => {
    const table = parseClipboard(text)
    if (table.length === 0) return
    const hasHeader = looksLikeHeader(table[0])
    const head = hasHeader ? table[0] : table[0].map((_, index) => `Columna ${index + 1}`)
    const body = hasHeader ? table.slice(1) : table
    const codes = parameters.map(item => item.code)
    // A saved template wins over the automatic guess, which is the point of saving it.
    const template = templatesRef.current.find(item => templateFits(head, item.columns.map(column => column.header)))
    setHeaders(head)
    setMapping(template ? applyTemplate(head, template.columns, codes) : guessMapping(head, codes))
    if (template) { setTemplateName(template.name); setNotice(`Correspondencia aplicada desde «${template.name}».`) }
    else setNotice('')
    setRows(body.map(cells => {
      const row: GridRow = { __ref: nextRef.current++ }
      head.forEach((_, column) => { row[`c${column}`] = cells[column] ?? '' })
      return row
    }))
    setResult(undefined)
  }, [parameters])

  const columns = useMemo(() => headers.map((header, index) => ({
    ...keyColumn(`c${index}`, textColumn),
    title: header || `Columna ${index + 1}`,
    minWidth: 110,
  })), [headers])

  /** Row number, tinted and with an icon when that row has a warning. */
  const gutterColumn = useMemo(() => ({
    title: '',
    basis: 54,
    grow: 0,
    shrink: 0,
    minWidth: 54,
    component: ({ rowIndex, rowData }: { rowIndex: number; rowData: GridRow }) => {
      const failed = rowData.__statusKind === 'ERROR' || rowData.__statusKind === 'DUPLICATE'
      return (
        <div className={`flex w-full items-center justify-center gap-1 text-[11px] ${failed ? 'font-semibold text-[#8e1f33]' : 'text-muted'}`}>
          {failed ? <AlertTriangle className="size-3" aria-hidden="true" /> : null}
          {rowIndex + 1}
        </div>
      )
    },
  }), [])

  /** Always-visible status column: the warning travels with its row, no matter how wide the sheet is. */
  const statusColumn = useMemo(() => ({
    title: 'Estado',
    basis: 260,
    grow: 0,
    shrink: 0,
    minWidth: 180,
    component: ({ rowData }: { rowData: GridRow }) => {
      const kind = rowData.__statusKind
      if (!kind) return <span className="px-2 text-[11px] text-muted">—</span>
      if (kind === 'OK') {
        return (
          <span className="flex items-center gap-1 px-2 text-[11px] font-semibold text-[#1f5c3a]">
            <CheckCircle2 className="size-3.5" aria-hidden="true" />Lista para importar
          </span>
        )
      }
      return (
        <span title={rowData.__status}
          className={`flex w-full items-center gap-1 px-2 text-[11px] ${kind === 'DUPLICATE' ? 'text-[#7a4a22]' : 'text-[#8e1f33]'}`}>
          {kind === 'DUPLICATE' ? <CopyCheck className="size-3.5 shrink-0" aria-hidden="true" /> : <AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />}
          <span className="truncate">{rowData.__status}</span>
        </span>
      )
    },
  }), [])

  const addColumn = () => {
    setHeaders(current => [...current, ''])
    setMapping(current => [...current, 'ignore'])
  }

  const removeColumn = (index: number) => {
    setHeaders(current => current.filter((_, position) => position !== index))
    setMapping(current => current.filter((_, position) => position !== index))
    // Cells shift left so every row keeps matching its (new) column order.
    setRows(current => current.map(row => {
      const moved: GridRow = { __ref: row.__ref }
      let target = 0
      headers.forEach((_, position) => {
        if (position === index) return
        moved[`c${target}`] = row[`c${position}`] ?? ''
        target++
      })
      return moved
    }))
  }

  const saveTemplate = async () => {
    const name = templateName.trim()
    if (!name) return
    try {
      const saved = await importApi.saveTemplate(name, headers.map((header, index) => ({
        header: header || `Columna ${index + 1}`, target: mapping[index] || 'ignore',
      })))
      setTemplates(current => [saved, ...current.filter(item => item.name !== saved.name)])
      setNotice(`Plantilla «${saved.name}» guardada: la próxima vez se aplicará sola.`)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido guardar la plantilla.')
    }
  }

  const useTemplate = (name: string) => {
    const template = templates.find(item => item.name === name)
    setTemplateName(name)
    if (!template) return
    setMapping(applyTemplate(headers, template.columns, parameters.map(item => item.code)))
    setNotice(`Correspondencia aplicada desde «${name}».`)
  }

  const runImport = async () => {
    setImporting(true)
    setError('')
    try {
      const response = await importApi.execute(okRows)
      setResult(response)
      if (response.imported > 0) {
        // Keep only what failed, so a second attempt just retries the fixed rows.
        const failed = new Set(response.rows.filter(row => row.status !== 'OK').map(row => row.reference))
        setRows(current => current.filter(row => row.__ref !== undefined && failed.has(row.__ref)))
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se ha podido importar.')
    } finally {
      setImporting(false)
    }
  }

  const errorCount = built.rows.length + built.issues.length - okRows.length

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-6"
      onPaste={event => {
        const text = event.clipboardData.getData('text/plain')
        if (!text.includes('\t')) return
        event.preventDefault()
        applyPaste(text)
      }}>
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-plum">
        <ArrowLeft className="size-4" />Volver a laboratorio
      </button>

      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[23px] font-semibold">Importar análisis</h1>
          <p className="mt-1 text-xs text-muted">
            Copia las filas en Google Sheets o Excel y pégalas aquí (Ctrl+V). Cada fila crea una muestra con sus
            resultados, ya validada, en el contenido que ocupaba el depósito en esa fecha.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setRows(emptyRows(3)); setResult(undefined); setPreview(undefined) }}
            className="flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold">
            <Trash2 className="size-3.5" />Vaciar
          </button>
          <button type="button"
            onClick={() => navigator.clipboard.readText().then(applyPaste).catch(() => setError('No se ha podido leer el portapapeles; usa Ctrl+V.'))}
            className="flex min-h-10 items-center gap-1.5 rounded-xl bg-plum px-3 text-xs font-semibold text-white">
            <ClipboardPaste className="size-3.5" />Pegar tabla
          </button>
        </div>
      </header>

      <section className="rounded-2xl border border-border bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Correspondencia de columnas</h2>
            <p className="mt-1 text-[11px] text-muted">
              Se detecta por el encabezado; corrige lo que no coincida. «ID» es el depósito.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {templates.length > 0 && (
              <select value={templateName} onChange={event => useTemplate(event.target.value)}
                aria-label="Plantilla guardada"
                className="min-h-9 rounded-lg border border-border bg-white px-2 text-[11.5px]">
                {templates.map(template => <option key={template.name} value={template.name}>{template.name}</option>)}
                {!templates.some(template => template.name === templateName) && (
                  <option value={templateName}>{templateName}</option>
                )}
              </select>
            )}
            {templates.length === 0 && (
              <input value={templateName} onChange={event => setTemplateName(event.target.value)}
                aria-label="Nombre de la plantilla" placeholder="Nombre de la plantilla"
                className="min-h-9 rounded-lg border border-border px-2 text-[11.5px]" />
            )}
            <button type="button" onClick={saveTemplate}
              className="flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[11.5px] font-semibold text-plum">
              <Save className="size-3.5" />Guardar plantilla
            </button>
            <button type="button" onClick={addColumn}
              className="flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-[11.5px] font-semibold">
              <Plus className="size-3.5" />Añadir columna
            </button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {headers.map((header, index) => (
            <div key={index} className="text-[11px] font-semibold">
              <div className="flex items-center gap-1">
                <input value={header} placeholder={`Columna ${index + 1}`}
                  onChange={event => setHeaders(current => current.map((item, position) => position === index ? event.target.value : item))}
                  aria-label={`Encabezado de la columna ${index + 1}`}
                  className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-[11px] font-semibold hover:border-border focus:border-plum focus:outline-none" />
                <button type="button" onClick={() => removeColumn(index)} aria-label={`Quitar la columna ${index + 1}`}
                  className="rounded p-1 text-muted hover:bg-plum-soft hover:text-plum"><X className="size-3" /></button>
              </div>
              <select value={mapping[index] ?? 'ignore'}
                onChange={event => setMapping(current => current.map((item, position) => position === index ? event.target.value as ColumnTarget : item))}
                className="mt-1 w-full rounded-lg border border-border bg-white p-2 text-[11.5px] font-normal">
                <option value="ignore">— No importar —</option>
                <option value="deposit">Depósito (ID)</option>
                <option value="date">Fecha</option>
                <option value="time">Hora</option>
                <option value="datetime">Fecha y hora</option>
                <option value="observations">Observaciones</option>
                <optgroup label="Parámetros">
                  {/* A detected parameter is listed even if the catalogue could not be loaded, so the
                      select never shows a mapping different from the one that will be sent. */}
                  {parameterOptions(parameters, mapping[index]).map(parameter => (
                    <option key={parameter.code} value={`param:${parameter.code}`}>{parameter.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
          <h2 className="text-sm font-semibold">Filas</h2>
          <span className="text-[11px] text-muted" role="status">
            {checking ? 'Comprobando…' : `${okRows.length} listas · ${errorCount} con avisos`}
          </span>
        </div>
        <div className="overflow-x-auto p-2">
          <DataSheetGrid<GridRow>
            // Remount when the pasted table changes shape: the grid caches its columns internally.
            key={headers.join('\u0000')}
            value={rows}
            onChange={updated => setRows(updated.map(row => row.__ref === undefined ? { ...row, __ref: nextRef.current++ } : row))}
            columns={columns}
            gutterColumn={gutterColumn}
            stickyRightColumn={statusColumn}
            height={360}
            rowClassName={({ rowData }) => rowData.__statusKind === 'DUPLICATE' ? 'bg-[#fdf3e2]'
              : rowData.__statusKind === 'ERROR' ? 'bg-[#fdeff1]' : undefined}
          />
        </div>
      </section>

      {issueByRow.size > 0 && (
        <details className="rounded-2xl border border-[#e3aab6] bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-[#8e1f33]">
            <AlertTriangle className="mr-1.5 inline size-4" />
            {issueByRow.size} fila(s) no se importarán · cada una lo indica en su columna «Estado»
          </summary>
          <ul className="mt-2 space-y-1 text-xs">
            {[...issueByRow.entries()].map(([reference, issue]) => (
              <li key={reference} className="flex gap-2">
                <span className="font-mono text-muted">#{rowNumber(rows, reference)}</span>
                <span>{issue.message}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {notice && <p role="status" className="rounded-xl bg-plum-soft p-3 text-xs text-plum">{notice}</p>}
      {error && <p role="alert" className="rounded-xl bg-[#f7dadf] p-3 text-xs text-[#8e1f33]">{error}</p>}

      {result && (
        <section className="rounded-2xl border border-[#b7d6bd] bg-white p-4">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-[#1f5c3a]">
            <Check className="size-4" />Importación finalizada
          </h2>
          <p className="mt-1 text-xs">
            {result.imported} análisis creados y validados. {result.skipped > 0 ? `${result.skipped} filas omitidas, siguen en la tabla para corregirlas.` : ''}
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-muted">
            {result.rows.filter(row => row.status === 'OK').slice(0, 8).map((row: ImportRowResult) => (
              <li key={row.reference} className="flex items-center gap-1.5">
                <Copy className="size-3" />{row.sampleCode} · {row.contentCode} · {row.parameters} parámetros
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={runImport} disabled={okRows.length === 0 || importing}
          className="min-h-11 rounded-xl bg-plum px-4 text-xs font-semibold text-white disabled:opacity-60">
          {importing ? 'Importando…' : `Importar ${okRows.length} fila(s)`}
        </button>
      </div>
    </div>
  )
}

function parameterOptions(catalogue: { code: string; name: string }[], selected?: ColumnTarget) {
  if (!selected?.startsWith('param:')) return catalogue
  const code = selected.slice('param:'.length)
  return catalogue.some(item => item.code === code) ? catalogue : [{ code, name: code }, ...catalogue]
}

function emptyRows(count: number): GridRow[] {
  return Array.from({ length: count }, () => ({} as GridRow))
}

function rowNumber(rows: GridRow[], reference: number): number {
  const index = rows.findIndex(row => row.__ref === reference)
  return index >= 0 ? index + 1 : reference
}
