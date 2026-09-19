import { useMemo, useState } from 'react'
import { formatDateTime, formatNumber } from '../../../lib/format'
import type { SeriesPoint, SeriesResponse } from '../services/tracking-api'
import { evaluateStatus, formatAge, formatPoint, formatSpan, statusClass, statusLabel } from '../utils'

const DAY_MS = 86_400_000
const th = 'px-3 py-2 text-left text-[11px] font-semibold text-muted'
const td = 'px-3 py-2 text-xs'

/** Rows = parameters, columns = tanks: the latest analysis of each, coloured by its target range. */
export function LatestComparison({ series, onOpenContent }: { series: SeriesResponse; onOpenContent: (code: string) => void }) {
  const contents = series.contents.filter((content) => !content.ancestor)
  const latest = useMemo(() => {
    const map = new Map<string, SeriesPoint>()
    for (const point of series.points) {
      const key = `${point.content}|${point.parameter}`
      const current = map.get(key)
      if (!current || point.takenAt > current.takenAt) map.set(key, point)
    }
    return map
  }, [series.points])
  const targetOf = (content: string, parameter: string) => series.targets.find((target) => target.content === content && target.parameter === parameter)
  const now = Date.now()

  return (
    <section className="rounded-2xl border border-border bg-white">
      <div className="px-4 pt-4">
        <h2 className="text-sm font-semibold">Última analítica de cada depósito</h2>
        <p className="mt-1 text-[11.5px] text-muted">Todos los parámetros elegidos, lado a lado. El color indica el estado frente al objetivo; debajo, la antigüedad de la muestra.</p>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="border-y border-border bg-[#fbf7f9]">
              <th className={th}>Parámetro</th>
              {contents.map((content) => (
                <th key={content.code} className={th}>
                  <button type="button" onClick={() => onOpenContent(content.code)} className="text-left font-semibold text-plum hover:underline">{content.code}</button>
                  <div className="font-normal">{[content.deposit, content.category].filter(Boolean).join(' · ')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {series.parameters.map((parameter) => (
              <tr key={parameter.code} className="border-b border-border last:border-0">
                <td className={`${td} font-semibold`}>{parameter.name}<span className="ml-1 font-normal text-muted">{parameter.unit}</span></td>
                {contents.map((content) => {
                  const point = latest.get(`${content.code}|${parameter.code}`)
                  if (!point) return <td key={content.code} className={`${td} text-muted`}>—</td>
                  const status = evaluateStatus(point, targetOf(content.code, parameter.code))
                  return (
                    <td key={content.code} className={td}>
                      <span title={`${statusLabel[status]} · ${formatDateTime(point.takenAt)}`} className={`inline-block rounded-md px-2 py-0.5 font-mono font-semibold ${statusClass[status]}`}>{formatPoint(point, parameter)}</span>
                      <div className="mt-0.5 text-[10.5px] text-muted">{formatAge(Math.floor((now - new Date(point.takenAt).getTime()) / DAY_MS))}{point.validated ? '' : ' · sin validar'}</div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** Two analyses of the same content side by side. Qualified values and different methods are never subtracted. */
export function DateComparison({ series }: { series: SeriesResponse }) {
  const requested = series.contents.filter((content) => !content.ancestor)
  const [contentCode, setContentCode] = useState(requested[0]?.code ?? '')
  const active = requested.some((content) => content.code === contentCode) ? contentCode : requested[0]?.code ?? ''

  const samples = useMemo(() => {
    const bySample = new Map<string, { code: string; takenAt: string; points: Map<string, SeriesPoint> }>()
    for (const point of series.points.filter((item) => item.content === active)) {
      const entry = bySample.get(point.sampleCode) ?? { code: point.sampleCode, takenAt: point.takenAt, points: new Map() }
      entry.points.set(point.parameter, point)
      bySample.set(point.sampleCode, entry)
    }
    return [...bySample.values()].sort((a, b) => a.takenAt.localeCompare(b.takenAt))
  }, [series.points, active])

  const [pickedA, setPickedA] = useState('')
  const [pickedB, setPickedB] = useState('')
  const sampleB = samples.find((sample) => sample.code === pickedB) ?? samples[samples.length - 1]
  const sampleA = samples.find((sample) => sample.code === pickedA) ?? samples[samples.length - 2]

  return (
    <section className="rounded-2xl border border-border bg-white p-4">
      <h2 className="text-sm font-semibold">Comparar dos análisis</h2>
      <p className="mt-1 text-[11.5px] text-muted">Elige dos fechas de un mismo contenido. pH usa diferencia absoluta; con calificadores («&lt; límite») o métodos distintos no se calcula diferencia.</p>
      {samples.length < 2 ? (
        <p className="mt-3 text-xs text-muted">Hace falta al menos dos análisis de un contenido para compararlos.</p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-end gap-3 text-xs">
            {requested.length > 1 && (
              <label className="grid gap-1 font-semibold text-muted">Contenido
                <select value={active} onChange={(event) => { setContentCode(event.target.value); setPickedA(''); setPickedB('') }} className="rounded-xl border border-border bg-white px-2 py-1.5 font-normal text-copy">
                  {requested.map((content) => <option key={content.code} value={content.code}>{content.code}</option>)}
                </select>
              </label>
            )}
            <SamplePicker label="Anterior" value={sampleA?.code ?? ''} samples={samples} onChange={setPickedA} />
            <SamplePicker label="Actual" value={sampleB?.code ?? ''} samples={samples} onChange={setPickedB} />
          </div>
          {sampleA && sampleB && (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse">
                <thead>
                  <tr className="border-y border-border bg-[#fbf7f9]">
                    <th className={th}>Parámetro</th><th className={th}>Anterior</th><th className={th}>Actual</th><th className={th}>Diferencia</th><th className={th}>Tiempo</th>
                  </tr>
                </thead>
                <tbody>
                  {series.parameters.filter((parameter) => sampleA.points.has(parameter.code) || sampleB.points.has(parameter.code)).map((parameter) => {
                    const before = sampleA.points.get(parameter.code)
                    const after = sampleB.points.get(parameter.code)
                    return (
                      <tr key={parameter.code} className="border-b border-border last:border-0">
                        <td className={`${td} font-semibold`}>{parameter.name}</td>
                        <td className={`${td} font-mono`}>{before ? `${formatPoint(before, parameter)} ${parameter.unit ?? ''}` : '—'}</td>
                        <td className={`${td} font-mono`}>{after ? `${formatPoint(after, parameter)} ${parameter.unit ?? ''}` : '—'}</td>
                        <td className={td}>{difference(before, after, parameter.code === 'PH', parameter.decimals)}</td>
                        <td className={`${td} text-muted`}>{formatSpan(sampleA.takenAt, sampleB.takenAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function SamplePicker({ label, value, samples, onChange }: { label: string; value: string; samples: Array<{ code: string; takenAt: string }>; onChange: (code: string) => void }) {
  return (
    <label className="grid gap-1 font-semibold text-muted">{label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-border bg-white px-2 py-1.5 font-normal text-copy">
        {samples.map((sample) => <option key={sample.code} value={sample.code}>{formatDateTime(sample.takenAt)} · {sample.code}</option>)}
      </select>
    </label>
  )
}

function difference(before: SeriesPoint | undefined, after: SeriesPoint | undefined, absoluteOnly: boolean, decimals: number): string {
  if (!before || !after) return '—'
  if (before.qualifier !== 'NONE' || after.qualifier !== 'NONE' || before.value === null || after.value === null) return 'No comparable (calificador)'
  if (before.method && after.method && before.method !== after.method) return 'Métodos incompatibles'
  const delta = after.value - before.value
  const sign = delta > 0 ? '+' : ''
  const absolute = `${sign}${formatNumber(delta, decimals)}`
  if (absoluteOnly || before.value === 0) return `${absolute}${absoluteOnly ? ' absoluta' : ''}`
  return `${absolute} (${sign}${formatNumber((delta / Math.abs(before.value)) * 100, 1)} %)`
}

/** Every plotted value as a table, with a link to the analysis it came from. */
export function DataTable({ series, onOpenSample }: { series: SeriesResponse; onOpenSample: (sampleCode: string) => void }) {
  const parameters = new Map(series.parameters.map((parameter) => [parameter.code, parameter]))
  const rows = [...series.points].sort((a, b) => b.takenAt.localeCompare(a.takenAt) || a.content.localeCompare(b.content))
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead><tr className="border-y border-border bg-[#fbf7f9]"><th className={th}>Fecha</th><th className={th}>Contenido</th><th className={th}>Parámetro</th><th className={th}>Valor</th><th className={th}>Estado</th><th className={th}>Muestra</th></tr></thead>
        <tbody>
          {rows.map((point) => {
            const parameter = parameters.get(point.parameter)
            return (
              <tr key={`${point.sampleCode}|${point.parameter}|${point.takenAt}`} className="border-b border-border last:border-0">
                <td className={td}>{formatDateTime(point.takenAt)}</td>
                <td className={`${td} font-mono`}>{point.content}</td>
                <td className={td}>{parameter?.name ?? point.parameter}</td>
                <td className={`${td} font-mono`}>{formatPoint(point, parameter)} <span className="font-sans text-muted">{parameter?.unit}</span></td>
                <td className={`${td} text-muted`}>{point.validated ? 'Validado' : 'Sin validar'}</td>
                <td className={td}><button type="button" onClick={() => onOpenSample(point.sampleCode)} className="font-semibold text-plum hover:underline">{point.sampleCode}</button></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
