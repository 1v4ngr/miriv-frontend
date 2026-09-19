import type { SeriesResponse } from './services/tracking-api'

const SEPARATOR = ';'
const cell = (value: string | number | boolean | null | undefined) => {
  if (value === null || value === undefined) return ''
  const text = typeof value === 'number' ? String(value).replace('.', ',') : String(value)
  return /[;"\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** CSV for Excel in Spanish locales: ";" separator, decimal comma, UTF-8 BOM added on download. */
export function seriesToCsv(series: SeriesResponse): string {
  const contents = new Map(series.contents.map((content) => [content.code, content]))
  const parameters = new Map(series.parameters.map((parameter) => [parameter.code, parameter]))
  const header = ['Contenido', 'Depósito', 'Parámetro', 'Unidad', 'Fecha y hora', 'Valor', 'Calificador', 'Límite', 'Validado', 'Muestra', 'Método']
  const rows = [...series.points]
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt) || a.content.localeCompare(b.content))
    .map((point) => [
      point.content, contents.get(point.content)?.deposit, parameters.get(point.parameter)?.name, parameters.get(point.parameter)?.unit,
      point.takenAt, point.value, point.qualifier, point.limit, point.validated ? 'Sí' : 'No', point.sampleCode, point.method,
    ].map(cell).join(SEPARATOR))
  return [header.join(SEPARATOR), ...rows].join('\r\n')
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
