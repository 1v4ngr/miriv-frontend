import { useState } from 'react'
import { formatNumber } from '../../../lib/format'
import type { TargetRange } from '../../tracking/services/tracking-api'
import { evaluateStatus, statusClass, statusLabel } from '../../tracking/utils'
import type { Target } from '../solver'
import type { BlendResult, ParameterResult } from '../types'

interface Props {
  result: BlendResult
  /** Ranges of the dominant wine of the blend, to colour the estimate. */
  targets: TargetRange[]
  /** Ranges typed in the proportion finder; they win over the stored ones for that parameter. */
  wanted: Target[]
}

function statusOf(item: ParameterResult, targets: TargetRange[], wanted: Target[]) {
  if (item.status !== 'OK' || item.value === null) return 'NONE' as const
  const point = item.qualifier === 'AT_MOST' ? { value: null, qualifier: 'LESS_THAN' as const, limit: item.value } : { value: item.value, qualifier: 'NONE' as const, limit: null }
  const own = wanted.find((target) => target.parameter === item.parameter.code)
  if (own) {
    const range: TargetRange = { content: '', parameter: own.parameter, warnMin: null, warnMax: null, critMin: own.min, critMax: own.max }
    return evaluateStatus(point, range) === 'CRIT' ? ('CRIT' as const) : ('OK' as const)
  }
  return evaluateStatus(point, targets.find((target) => target.parameter === item.parameter.code))
}

function estimate(item: ParameterResult): string {
  const decimals = item.parameter.decimals
  if (item.status === 'INCOMPLETE') return `Incompleto: falta en ${item.missing.join(', ')}`
  if (item.status === 'NOT_BLENDABLE') return 'No se puede estimar'
  if (item.value === null) return '—'
  if (item.qualifier === 'AT_MOST') {
    const range = item.lowerBound !== null ? ` (entre ${formatNumber(item.lowerBound, decimals)} y ${formatNumber(item.value, decimals)})` : ''
    return `≤ ${formatNumber(item.value, decimals)}${range}`
  }
  return formatNumber(item.value, decimals)
}

const th = 'px-3 py-2 text-left text-[11px] font-semibold text-muted'

/** Estimated parameters of the blend, with the range of the tanks that make it, its status and how it was computed. */
export function ResultTable({ result, targets, wanted }: Props) {
  const [showOthers, setShowOthers] = useState(false)
  const main = result.parameters.filter((item) => item.status !== 'NOT_BLENDABLE')
  const others = result.parameters.filter((item) => item.status === 'NOT_BLENDABLE')
  if (result.parameters.length === 0) return <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">Añade litros de algún depósito para ver el resultado estimado.</p>
  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] border-collapse text-xs">
          <thead><tr className="border-b border-border bg-[#fbf7f9]"><th className={th}>Parámetro</th><th className={th}>Estimado</th><th className={th}>Depósitos</th><th className={th}>Estado</th></tr></thead>
          <tbody>
            {main.map((item) => {
              const status = statusOf(item, targets, wanted)
              return (
                <tr key={item.parameter.code} className="border-b border-border align-top last:border-0">
                  <td className="px-3 py-2 font-semibold">{item.parameter.name}<span className="ml-1 font-normal text-muted">{item.parameter.unit}</span>
                    <details className="mt-0.5 font-normal text-muted"><summary className="cursor-pointer text-[10.5px]">{item.notes[0]}</summary>
                      <ul className="mt-1 list-disc pl-4 text-[10.5px]">{item.notes.slice(1).map((note) => <li key={note}>{note}</li>)}</ul>
                    </details>
                  </td>
                  <td className={`px-3 py-2 font-mono ${item.status === 'INCOMPLETE' ? 'font-sans text-[#6b5a10]' : 'font-semibold'}`}>{estimate(item)}</td>
                  <td className="px-3 py-2 font-mono text-muted">{item.componentMin === null ? '—' : `${formatNumber(item.componentMin, item.parameter.decimals)} – ${formatNumber(item.componentMax, item.parameter.decimals)}`}</td>
                  <td className="px-3 py-2">{status === 'NONE' ? <span className="text-muted">—</span> : <span className={`rounded-md px-2 py-0.5 font-semibold ${statusClass[status]}`}>{statusLabel[status]}</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {others.length > 0 && (
        <p className="mt-2 text-[11px] text-muted">
          {others.length} parámetro(s) no se pueden estimar (se miden tras la mezcla){' '}
          <button type="button" onClick={() => setShowOthers((current) => !current)} className="font-semibold text-plum underline">{showOthers ? 'ocultar' : 'ver'}</button>
          {showOthers && <span className="block">{others.map((item) => item.parameter.name).join(', ')}</span>}
        </p>
      )}
    </div>
  )
}
