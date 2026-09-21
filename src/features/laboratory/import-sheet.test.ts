import { describe, expect, it } from 'vitest'
import {
  applyTemplate, buildRows, guessMapping, looksLikeHeader, normalizeHeader, parseClipboard, parseDate,
  parseTime, templateFits, type ColumnTarget,
} from './import-sheet'

const HEADER = 'Time\tComments\tID\tProducto\tEtanol\tGlu.+Fruc.\tAci. Total TH2\tpH\tAci. Vola.\tDensidad\tAz. Reduct.\tA. Malico\tCO2\tAci. Total\tFecha\tHora\tTEMPERATURA'
const ROW = '9:31:04\t\tE-8\tMOSTO BAJO FERMENTACION\t5,27\t129\t5,79\t3,34\t0,44\t1,05\t136,6\t1,61\t8023\t3,78\t20/09/2026\t9:31:04\t12,5ºC'

describe('parseClipboard', () => {
  it('splits a spreadsheet paste into cells and drops blank lines', () => {
    const table = parseClipboard(`${HEADER}\n${ROW}\n\n`)
    expect(table).toHaveLength(2)
    expect(table[1][2]).toBe('E-8')
    expect(table[1][16]).toBe('12,5ºC')
  })
  it('keeps quoted cells containing tabs or newlines', () => {
    const table = parseClipboard('a\t"con\ttab"\n"dos\nlineas"\tb')
    expect(table[0]).toEqual(['a', 'con\ttab'])
    expect(table[1]).toEqual(['dos\nlineas', 'b'])
  })
})

describe('column matching', () => {
  it('detects the analyser header row', () => {
    expect(looksLikeHeader(HEADER.split('\t'))).toBe(true)
    expect(looksLikeHeader(ROW.split('\t'))).toBe(false)
  })
  it('maps the sheet columns to MIRIV parameters', () => {
    const mapping = guessMapping(HEADER.split('\t'))
    expect(mapping[2]).toBe('deposit')
    expect(mapping[4]).toBe('param:ETHANOL')
    expect(mapping[6]).toBe('param:TOTAL_ACIDITY_TH2')
    expect(mapping[13]).toBe('param:TOTAL_ACIDITY')
    expect(mapping[14]).toBe('date')
    expect(mapping[15]).toBe('time')
    expect(mapping[16]).toBe('param:CONTENT_TEMPERATURE')
    expect(mapping[3]).toBe('ignore') // Producto
  })
  it('falls back to parameter codes coming from the catalogue', () => {
    expect(guessMapping(['FREE_SO2'], ['FREE_SO2'])[0]).toBe('param:FREE_SO2')
    expect(normalizeHeader('Aci. Total TH2')).toBe('acitotalth2')
  })
})

describe('dates', () => {
  it('reads both spreadsheet formats', () => {
    expect(parseDate('20/09/2026')).toBe('2026-09-20')
    expect(parseDate('2026-9-7')).toBe('2026-09-07')
    expect(parseDate('7-9-26')).toBe('2026-09-07')
    expect(parseDate('no es fecha')).toBeUndefined()
    expect(parseTime('9:31:04')).toBe('09:31:04')
    expect(parseTime('10:06')).toBe('10:06:00')
  })
})

describe('buildRows', () => {
  const mapping = guessMapping(HEADER.split('\t')) as ColumnTarget[]
  const sheetOf = (line: string) => [{ reference: 1, cells: line.split('\t') }]

  it('builds the payload of a pasted analyser row', () => {
    const { rows, issues } = buildRows(sheetOf(ROW), mapping)
    expect(issues).toEqual([])
    expect(rows[0].deposit).toBe('E-8')
    expect(rows[0].takenAt).toBe('2026-09-20T09:31:04')
    expect(rows[0].values.PH).toBe('3,34')
    expect(rows[0].values.CONTENT_TEMPERATURE).toBe('12,5ºC')
    expect(rows[0].values.ETHANOL).toBe('5,27')
  })

  it('reports rows without deposit, without date or without values', () => {
    const noDeposit = ROW.split('\t'); noDeposit[2] = ''
    const noDate = ROW.split('\t'); noDate[14] = ''
    const noValues = HEADER.split('\t').map((_, index) => index === 2 ? 'E-8' : index === 14 ? '20/09/2026' : '')

    expect(buildRows([{ reference: 1, cells: noDeposit }], mapping).issues[0].message).toContain('Falta el depósito')
    expect(buildRows([{ reference: 2, cells: noDate }], mapping).issues[0].message).toContain('Fecha no reconocida')
    expect(buildRows([{ reference: 3, cells: noValues }], mapping).issues[0].message).toContain('ningún valor')
  })

  it('ignores fully empty rows instead of flagging them', () => {
    const { rows, issues } = buildRows([{ reference: 9, cells: ['', '', ''] }], mapping)
    expect(rows).toEqual([])
    expect(issues).toEqual([])
  })
})

describe('saved templates', () => {
  const template = [
    { header: 'ID', target: 'deposit' },
    { header: 'Fecha', target: 'date' },
    { header: 'Sonda', target: 'param:CONTENT_TEMPERATURE' },
    { header: 'Producto', target: 'ignore' },
  ]

  it('recognises the sheet it was saved from, in any column order', () => {
    expect(templateFits(['Producto', 'ID', 'Fecha', 'Sonda'], template.map(column => column.header))).toBe(true)
    expect(templateFits(['Otra', 'Cosa', 'Distinta'], template.map(column => column.header))).toBe(false)
    expect(templateFits([], template.map(column => column.header))).toBe(false)
  })

  it('wins over the automatic guess and keeps guessing unknown columns', () => {
    const mapping = applyTemplate(['ID', 'Sonda', 'Producto', 'pH'], template)
    expect(mapping).toEqual(['deposit', 'param:CONTENT_TEMPERATURE', 'ignore', 'param:PH'])
  })
})

describe('finished-wine worksheet', () => {
  const WINE_HEADER = 'ID\tProducto\tFecha\tGrado\tAz. Reduct.\tpH\tAci. total TH2\tA. Tart.\tA. Malico\tA. Lacti.\tAci. Vola.\tIC\tA420\tA520\tA620\tA. Glucon.\tGlu.+Fruc.\tAci. total\tDensidad\tGlicerol\tGlucosa\tFructosa\tA. Citrico\tA. Sorbico\tCO2\tI.P.T.\tHora'

  it('maps every column of the wine sheet', () => {
    const headers = WINE_HEADER.split('\t')
    const mapping = guessMapping(headers)
    const unmapped = headers.filter((_, index) => mapping[index] === 'ignore')
    expect(unmapped).toEqual(['Producto'])
    expect(mapping[headers.indexOf('Grado')]).toBe('param:ETHANOL')
    expect(mapping[headers.indexOf('IC')]).toBe('param:COLOR_INTENSITY')
    expect(mapping[headers.indexOf('I.P.T.')]).toBe('param:TOTAL_POLYPHENOL_INDEX')
    expect(mapping[headers.indexOf('A. Sorbico')]).toBe('param:SORBIC_ACID')
  })

  it('recognises a parameter created in Administración by its name', () => {
    expect(guessMapping(['Sulfatos'], [{ code: 'SULPHATES', name: 'Sulfatos' }])[0]).toBe('param:SULPHATES')
  })
})
