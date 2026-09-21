import type { ImportRowInput } from './services/import-api'

/** What a pasted column feeds: the deposit (ID), the date, the time, one parameter, or nothing. */
export type ColumnTarget = 'ignore' | 'deposit' | 'date' | 'time' | 'datetime' | 'observations' | `param:${string}`

export interface SheetRow {
  /** Stable id so warnings survive edits and re-sorting. */
  reference: number
  cells: string[]
}

export interface RowIssue {
  reference: number
  message: string
  kind: 'ERROR' | 'DUPLICATE'
}

/** Header text → parameter code, for the analyser sheets used in the cellar. */
const HEADER_ALIASES: Record<string, ColumnTarget> = {
  id: 'deposit', deposito: 'deposit', deposito_: 'deposit', tank: 'deposit',
  fecha: 'date', date: 'date',
  hora: 'time', time: 'time',
  fechayhora: 'datetime', timestamp: 'datetime',
  comments: 'observations', comentarios: 'observations', observaciones: 'observations',
  etanol: 'param:ETHANOL', alcohol: 'param:ETHANOL', ethanol: 'param:ETHANOL',
  glufruc: 'param:GLUCOSE_FRUCTOSE', glucosafructosa: 'param:GLUCOSE_FRUCTOSE', glucosamasfructosa: 'param:GLUCOSE_FRUCTOSE',
  acitotalth2: 'param:TOTAL_ACIDITY_TH2', acideztotalth2: 'param:TOTAL_ACIDITY_TH2',
  ph: 'param:PH',
  acivola: 'param:VOLATILE_ACIDITY', acidezvolatil: 'param:VOLATILE_ACIDITY',
  densidad: 'param:DENSITY', density: 'param:DENSITY',
  azreduct: 'param:REDUCING_SUGARS', azucaresreductores: 'param:REDUCING_SUGARS',
  amalico: 'param:MALIC_ACID', acidomalico: 'param:MALIC_ACID', malico: 'param:MALIC_ACID',
  co2: 'param:DISSOLVED_CO2', co2disuelto: 'param:DISSOLVED_CO2',
  acitotal: 'param:TOTAL_ACIDITY', acideztotal: 'param:TOTAL_ACIDITY',
  temperatura: 'param:CONTENT_TEMPERATURE', temp: 'param:CONTENT_TEMPERATURE',
  temperaturadelcontenido: 'param:CONTENT_TEMPERATURE',
  so2libre: 'param:FREE_SO2', so2total: 'param:TOTAL_SO2', yan: 'param:YAN',
  alactico: 'param:L_LACTIC_ACID', acidolactico: 'param:L_LACTIC_ACID', alacti: 'param:L_LACTIC_ACID',
  // Finished-wine worksheet
  grado: 'param:ETHANOL', gradoalcoholico: 'param:ETHANOL',
  atart: 'param:TARTARIC_ACID', acidotartarico: 'param:TARTARIC_ACID',
  ic: 'param:COLOR_INTENSITY', intensidadcolorante: 'param:COLOR_INTENSITY',
  a420: 'param:ABS_420', a520: 'param:ABS_520', a620: 'param:ABS_620',
  aglucon: 'param:GLUCONIC_ACID', acidogluconico: 'param:GLUCONIC_ACID',
  glicerol: 'param:GLYCEROL', glucosa: 'param:GLUCOSE', fructosa: 'param:FRUCTOSE',
  acitrico: 'param:CITRIC_ACID', acidocitrico: 'param:CITRIC_ACID',
  asorbico: 'param:SORBIC_ACID', acidosorbico: 'param:SORBIC_ACID',
  ipt: 'param:TOTAL_POLYPHENOL_INDEX', indicedepolifenolestotales: 'param:TOTAL_POLYPHENOL_INDEX',
}

/** Loses accents, punctuation and case so "Aci. Total TH2" and "acidez total th2" match the same key. */
export function normalizeHeader(header: string): string {
  return header
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9+]/g, '')
    .replace(/\+/g, '')
}

/** A spreadsheet paste is TSV; quoted cells may contain newlines. */
export function parseClipboard(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += char
      continue
    }
    if (char === '"' && cell === '') { quoted = true; continue }
    if (char === '\t') { row.push(cell.trim()); cell = ''; continue }
    if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(cell.trim())
      rows.push(row)
      row = []
      cell = ''
      continue
    }
    cell += char
  }
  if (cell !== '' || row.length) { row.push(cell.trim()); rows.push(row) }
  return rows.filter(item => item.some(value => value !== ''))
}

/** True when the first pasted line looks like headers rather than data. */
export function looksLikeHeader(cells: string[]): boolean {
  const known = cells.filter(cell => HEADER_ALIASES[normalizeHeader(cell)] !== undefined).length
  return known >= 2
}

/** A catalogue parameter, by code alone or with its name (so parameters created in Administración match too). */
export type KnownParameter = string | { code: string; name: string }

export function guessMapping(headers: string[], knownParameters: KnownParameter[] = []): ColumnTarget[] {
  const known = knownParameters.map(item => (typeof item === 'string' ? { code: item, name: item } : item))
  return headers.map(header => {
    const key = normalizeHeader(header)
    const alias = HEADER_ALIASES[key]
    if (alias) return alias
    const direct = known.find(item => normalizeHeader(item.code) === key || normalizeHeader(item.name) === key)
    return direct ? (`param:${direct.code}` as ColumnTarget) : 'ignore'
  })
}

/** dd/mm/yyyy, yyyy-mm-dd or dd-mm-yy → ISO date; undefined when it is not a date. */
export function parseDate(raw: string): string | undefined {
  const value = raw.trim()
  if (!value) return undefined
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value)
  if (iso) return `${iso[1]}-${pad(iso[2])}-${pad(iso[3])}`
  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(value)
  if (!dmy) return undefined
  const year = dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]
  return `${year}-${pad(dmy[2])}-${pad(dmy[1])}`
}

/** h:mm[:ss] → HH:mm:ss. */
export function parseTime(raw: string): string | undefined {
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(raw.trim())
  return match ? `${pad(match[1])}:${match[2]}:${match[3] ?? '00'}` : undefined
}

const pad = (value: string) => value.padStart(2, '0')

/** A saved template fits when it covers the pasted headers, whatever their order. */
export function templateFits(headers: string[], templateHeaders: string[]): boolean {
  const saved = new Set(templateHeaders.map(normalizeHeader))
  const pasted = headers.map(normalizeHeader).filter(header => header !== '')
  if (pasted.length === 0) return false
  const covered = pasted.filter(header => saved.has(header)).length
  return covered >= Math.max(2, Math.ceil(pasted.length * 0.6))
}

/** Applies a saved matching by header name, falling back to the automatic guess for new columns. */
export function applyTemplate(headers: string[], template: { header: string; target: string }[],
                              knownParameters: KnownParameter[] = []): ColumnTarget[] {
  const byHeader = new Map(template.map(column => [normalizeHeader(column.header), column.target as ColumnTarget]))
  const guessed = guessMapping(headers, knownParameters)
  return headers.map((header, index) => byHeader.get(normalizeHeader(header)) ?? guessed[index])
}

export interface BuiltRows {
  rows: ImportRowInput[]
  issues: RowIssue[]
}

/**
 * Turns the grid into the request payload, reporting locally what the server would reject anyway
 * (missing deposit, unreadable date) so the operator sees it while typing.
 */
export function buildRows(sheet: SheetRow[], mapping: ColumnTarget[]): BuiltRows {
  const rows: ImportRowInput[] = []
  const issues: RowIssue[] = []
  const index = (target: ColumnTarget) => mapping.indexOf(target)
  const depositColumn = index('deposit')
  const dateColumn = index('date')
  const timeColumn = index('time')
  const dateTimeColumn = index('datetime')
  const observationsColumn = index('observations')

  for (const row of sheet) {
    const cells = row.cells
    if (cells.every(cell => !cell?.trim())) continue
    const deposit = depositColumn >= 0 ? (cells[depositColumn] ?? '').trim() : ''
    const values: Record<string, string> = {}
    mapping.forEach((target, column) => {
      if (!target.startsWith('param:')) return
      const value = (cells[column] ?? '').trim()
      if (value) values[target.slice('param:'.length)] = value
    })

    if (!deposit) {
      issues.push({ reference: row.reference, kind: 'ERROR', message: 'Falta el depósito (columna ID).' })
      continue
    }
    let date: string | undefined
    let time: string | undefined
    if (dateTimeColumn >= 0) {
      const [rawDate, rawTime] = (cells[dateTimeColumn] ?? '').trim().split(/[ T]+/)
      date = parseDate(rawDate ?? '')
      time = parseTime(rawTime ?? '')
    }
    if (dateColumn >= 0) date = parseDate(cells[dateColumn] ?? '') ?? date
    if (timeColumn >= 0) time = parseTime(cells[timeColumn] ?? '') ?? time
    if (!date) {
      issues.push({ reference: row.reference, kind: 'ERROR', message: 'Fecha no reconocida: usa dd/mm/aaaa.' })
      continue
    }
    if (Object.keys(values).length === 0) {
      issues.push({ reference: row.reference, kind: 'ERROR', message: 'La fila no trae ningún valor analítico.' })
      continue
    }
    rows.push({
      reference: row.reference,
      deposit,
      takenAt: `${date}T${time ?? '00:00:00'}`,
      values,
      observations: observationsColumn >= 0 ? (cells[observationsColumn] ?? '').trim() || undefined : undefined,
    })
  }
  return { rows, issues }
}
